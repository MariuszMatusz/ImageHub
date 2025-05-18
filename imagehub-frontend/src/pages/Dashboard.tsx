import React, { useState, useEffect } from "react";
import "../styles/Dashboard.css";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import FolderGrid from "../components/FolderGrid";
import axiosInstance from "../utils/axiosInstance";
import { mapToLocalStorage, mapToObject } from "../utils/localStorageHelper";
import { UserRole } from "./PermissionManagement";
import { usePermissions } from '../contexts/PermissionContext';

const Dashboard: React.FC = () => {
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
    const [folders, setFolders] = useState([]);
    const [userRole, setUserRole] = useState<UserRole | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    // Wyszukiwanie
    const [searchTerm, setSearchTerm] = useState<string>("");
    // Globalne wyszukiwanie wyników
    const [searchResults, setSearchResults] = useState<any[]>([]);
    // Sprawdzenie, czy jesteśmy w trybie wyszukiwania globalnego
    const [isGlobalSearch, setIsGlobalSearch] = useState<boolean>(false);
    const [isAdmin, setIsAdmin] = useState<boolean>(false);

    // Użyj kontekstu uprawnień
    const { permissions, hasPermission } = usePermissions();
    const [permissionsLoaded, setPermissionsLoaded] = useState(false);

    useEffect(() => {
        // Czekaj na załadowanie uprawnień z kontekstu uprawnień
        if (permissions.isLoading) {
            console.log("Permissions still loading, waiting...");
            return;
        }
        // Rejestruj, że uprawnienia są ładowane
        console.log("Permissions loaded, proceeding with user data fetch");
        setPermissionsLoaded(true);

        // Sprawdź adres URL dla parametru folderu
        const params = new URLSearchParams(window.location.search);
        const folderParam = params.get('folder');

        loadUserData(folderParam);
    }, [permissions.isLoading]);

    // Funkcja do pobierania danych użytkownika i folderów
    const loadUserData = async (folderParam: string | null) => {
        try {
            // Uzyskaj informacje o użytkowniku
            const userResponse = await axiosInstance.get("/users/me");
            const userData = userResponse.data;

            // Loguj uprawnienia użytkownika dla debugowania
            console.log("Pobrane uprawnienia użytkownika:", userData.role?.permissions);

            // Sprawdź uprawnienia do folderów
            const permissionsResponse = await axiosInstance.get("/users/me/permissions");
            const permissionsData = permissionsResponse.data;

            // Oznacz, że uprawnienia zostały załadowane
            setPermissionsLoaded(true);

            console.log("Pobrane uprawnienia do folderów:", permissionsResponse.data);



            if (userData.role && (!userData.role.permissions || userData.role.permissions.length === 0)) {
                userData.role.permissions = permissionsResponse.data.rolePermissions || [];
            }

            // Ustawienie roli i statusu admina
            setUserRole(userData.role);
            setIsAdmin(userData.role?.name === 'ADMIN');

            // Zapisz dane roli do localStorage
            const roleString = mapToLocalStorage(userData.role);
            localStorage.setItem("role", roleString);



            // Wybierz endpoint na podstawie roli
            const endpoint = userData.role?.name === 'ADMIN' ? "/nextcloud/files" : "/nextcloud/my-folders";

            // Pobierz foldery
            const foldersResponse = await axiosInstance.get(endpoint, {
                params: {
                    includeChildren: true,
                    depth: 3
                }
            });

            setFolders(foldersResponse.data);

            // Ustaw domyślny wybrany folder
            if (folderParam) {
                setSelectedFolderId(folderParam);
            } else if (foldersResponse.data.length > 0 && !selectedFolderId) {
                if (foldersResponse.data[0].children && foldersResponse.data[0].children.length > 0) {
                    setSelectedFolderId(foldersResponse.data[0].children[0].path);
                } else {
                    setSelectedFolderId(foldersResponse.data[0].path);
                }
            }

            setIsLoading(false);
        } catch (error) {
            console.error("Błąd podczas pobierania danych:", error);
            setError("Nie udało się załadować danych. Sprawdź połączenie i spróbuj ponownie.");
            setIsLoading(false);
        }
    };

    // Obsługiwanie wybór folderu
    const handleFolderSelect = (folderId: string | null) => {
        // Resetuj stan wyszukiwania podczas zmiany folderów
        setIsGlobalSearch(false);
        setSearchTerm("");

        // Najpierw zaktualizuj adres URL
        if (folderId) {
            const url = new URL(window.location.href);
            url.searchParams.set('folder', folderId);
            window.history.pushState({}, '', url.toString());
        } else {
            const url = new URL(window.location.href);
            url.searchParams.delete('folder');
            window.history.pushState({}, '', url.toString());
        }

        // ponowne renderowanie, ustawiając tymczasowo wartość null
        setSelectedFolderId(null);

        // setTimeout, aby zapewnić oddzielne aktualizacje stanu
        setTimeout(() => {
            setSelectedFolderId(folderId);
        }, 10);
    };

    // Obsługa wyszukiwania globalnego
    const handleGlobalSearch = (term: string) => {
        setSearchTerm(term);

        if (!term.trim()) {
            setIsGlobalSearch(false);
            setSearchResults([]);
            return;
        }

        // Sprawdź, czy użytkownik ma uprawnienia do wyszukiwania
        if (!hasPermission("files_read")) {
            setError("Brak uprawnień do wyszukiwania");
            return;
        }

        // API zapytań do wyszukiwania plików i folderów pasujących do terminu
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
                setError("Błąd podczas wyszukiwania. Spróbuj ponownie.");
                // W przypadku błędu pozostań w normalnym trybie wyświetlania
                setIsGlobalSearch(false);
            });
    };

    // Gdy kontekst uprawnień jest w trakcie ładowania, pokaż ładowanie
    if (permissions.isLoading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Ładowanie uprawnień...</p>
            </div>
        );
    }

    // Pokaż loader podczas ładowania danych
    if (isLoading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Ładowanie danych...</p>
            </div>
        );
    }

    // Wyświetl błąd, jeśli wystąpił
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
                    isAdmin={isAdmin}
                    selectedFolderId={selectedFolderId}
                    maxFolderDepth={1}
                    onSearch={handleGlobalSearch}
                />
                <div className="content-area">
                    {permissionsLoaded ? (
                        <FolderGrid
                            parentFolderId={selectedFolderId}
                            userRole={userRole || null}
                            searchTerm={searchTerm}
                            isGlobalSearch={isGlobalSearch}

                            searchResults={searchResults}
                        />
                    ) : (
                        <div className="loading-container">
                            <div className="loading-spinner"></div>
                            <p>Ładowanie uprawnień...</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;