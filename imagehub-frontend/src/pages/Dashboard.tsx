import React, { useState, useEffect } from "react";
import "../styles/Dashboard.css";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import FolderGrid from "../components/FolderGrid";
import axiosInstance from "../utils/axiosInstance";

const Dashboard: React.FC = () => {
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
    const [folders, setFolders] = useState([]);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Pobierz informacje o zalogowanym użytkowniku
        axiosInstance.get("/users/me")
            .then(response => {
                setUserRole(response.data.role);
                return response.data.role;
            })
            .then(role => {
                // Pobierz odpowiednią listę folderów w zależności od roli
                const endpoint = role === 'ADMIN' ? "/nextcloud/files" : "/nextcloud/my-folders";
                return axiosInstance.get(endpoint, {
                    params: {
                        includeChildren: true,
                        depth: 3
                    }
                });
            })
            .then(response => {
                setFolders(response.data);
                setIsLoading(false);

                // Automatycznie wybierz pierwszy folder jeśli nie ma wybranego
                if (response.data.length > 0 && !selectedFolderId) {
                    // Sprawdź czy pierwsza pozycja ma dzieci
                    if (response.data[0].children && response.data[0].children.length > 0) {
                        setSelectedFolderId(response.data[0].children[0].path);
                    } else {
                        setSelectedFolderId(response.data[0].path);
                    }
                }
            })
            .catch(error => {
                console.error("Error fetching data:", error);
                setError("Nie udało się załadować danych. Spróbuj ponownie później.");
                setIsLoading(false);
            });
    }, []);

    // Sprawdź URL dla parametru folderu
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const folderParam = params.get('folder');
        if (folderParam) {
            setSelectedFolderId(folderParam);
        }
    }, []);

    if (isLoading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Ładowanie danych...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="error-container">
                <h2>Wystąpił błąd</h2>
                <p>{error}</p>
                <button onClick={() => window.location.reload()}>Odśwież stronę</button>
            </div>
        );
    }

    return (
        <div className="dashboard-container">
            <Navbar />
            <div className="dashboard-content">
                <Sidebar
                    folders={folders}
                    setSelectedFolderId={setSelectedFolderId}
                    isAdmin={userRole === 'ADMIN'}
                    selectedFolderId={selectedFolderId}
                />
                <div className="content-area">
                    <FolderGrid
                        parentFolderId={selectedFolderId}
                        userRole={userRole || ''}
                    />
                </div>
            </div>
        </div>
    );
};

export default Dashboard;