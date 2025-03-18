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
    // State for search
    const [searchTerm, setSearchTerm] = useState<string>("");
    // State for global search results
    const [searchResults, setSearchResults] = useState<any[]>([]);
    // State to determine if we're in global search mode
    const [isGlobalSearch, setIsGlobalSearch] = useState<boolean>(false);

    useEffect(() => {
        // Check URL for folder parameter
        const params = new URLSearchParams(window.location.search);
        const folderParam = params.get('folder');

        // Get logged in user info
        axiosInstance.get("/users/me")
            .then(response => {
                setUserRole(response.data.role);
                localStorage.setItem("role", response.data.role); // Store role in localStorage
                return response.data.role;
            })
            .then(role => {
                // Get appropriate folder list based on role
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

                // First check URL parameter if present
                if (folderParam) {
                    setSelectedFolderId(folderParam);
                }
                // If no URL parameter, select default folder
                else if (response.data.length > 0 && !selectedFolderId) {
                    // Check if first item has children
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

    // Handle folder selection
    const handleFolderSelect = (folderId: string | null) => {
        // Reset search state when changing folders
        setIsGlobalSearch(false);
        setSearchTerm("");

        // Update URL first
        if (folderId) {
            const url = new URL(window.location.href);
            url.searchParams.set('folder', folderId);
            window.history.pushState({}, '', url.toString());
        } else {
            const url = new URL(window.location.href);
            url.searchParams.delete('folder');
            window.history.pushState({}, '', url.toString());
        }

        // Force re-render by temporarily setting to null
        setSelectedFolderId(null);

        // Use setTimeout to ensure separate state updates
        setTimeout(() => {
            setSelectedFolderId(folderId);
        }, 10);
    };

    // Handle global search
    const handleGlobalSearch = (term: string) => {
        setSearchTerm(term);

        if (!term.trim()) {
            setIsGlobalSearch(false);
            setSearchResults([]);
            return;
        }

        // Query API to search for files and folders matching term
        axiosInstance.get('/nextcloud/search', {
            params: {
                query: term
            }
        })
            .then(response => {
                setSearchResults(response.data);
                setIsGlobalSearch(true);
            })
            .catch(error => {
                console.error("Error searching files:", error);
                // On error, stay in normal display mode
                setIsGlobalSearch(false);
            });
    };

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
                    setSelectedFolderId={handleFolderSelect}
                    isAdmin={userRole === 'ADMIN'}
                    selectedFolderId={selectedFolderId}
                    maxFolderDepth={1}
                    onSearch={handleGlobalSearch}
                />
                <div className="content-area">
                    <FolderGrid
                        parentFolderId={selectedFolderId}
                        userRole={userRole || ''}
                        searchTerm={searchTerm}
                        isGlobalSearch={isGlobalSearch}
                        searchResults={searchResults}
                    />
                </div>
            </div>
        </div>
    );
};

export default Dashboard;