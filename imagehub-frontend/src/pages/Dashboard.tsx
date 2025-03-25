import React, { useState, useEffect } from "react";
import "../styles/Dashboard.css";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import FolderGrid from "../components/FolderGrid";
import axiosInstance from "../utils/axiosInstance";
import { mapToLocalStorage, mapToObject } from "../utils/localStorageHelper";
import { UserRole } from "./PermissionManagement";

const Dashboard: React.FC = () => {
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
    const [folders, setFolders] = useState([]);
    const [userRole, setUserRole] = useState<UserRole | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    // State for search
    const [searchTerm, setSearchTerm] = useState<string>("");
    // State for global search results
    const [searchResults, setSearchResults] = useState<any[]>([]);
    // State to determine if we're in global search mode
    const [isGlobalSearch, setIsGlobalSearch] = useState<boolean>(false);
    const [isAdmin, setIsAdmin] = useState<boolean>(false);

    useEffect(() => {
        // Check URL for folder parameter
        const params = new URLSearchParams(window.location.search);
        const folderParam = params.get('folder');

        // Try to get user info from localStorage
        const roleFromLogin = localStorage.getItem("role");
        const userRoleFromToken = roleFromLogin ? mapToObject<UserRole | string>(roleFromLogin) : null;

        // Define role object from string
        const userRoleObject: UserRole = {
            name: typeof userRoleFromToken === 'string' ? userRoleFromToken :
                (typeof userRoleFromToken === 'object' && userRoleFromToken !== null && 'name' in userRoleFromToken) ?
                    (userRoleFromToken as UserRole).name : '',
            permissions: []
        };
console.log(userRoleObject.name)
        // Set role data
        if (userRoleObject.name) {
            setUserRole(userRoleObject);
            setIsAdmin(userRoleObject.name === 'ADMIN');

            // Get appropriate folder list based on role
            const endpoint = userRoleObject.name === 'ADMIN' ? "/nextcloud/files" : "/nextcloud/my-folders";
            axiosInstance.get(endpoint, {
                params: {
                    includeChildren: true,
                    depth: 3
                }
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
                    console.error("Error fetching folders:", error);
                    setError("Nie udało się załadować danych folderów. Spróbuj ponownie później.");
                    setIsLoading(false);
                });
        } else {
            // Fallback to try getting user info from API
            axiosInstance.get("/users/me")
                .then(response => {
                    const roleData = response.data.role;
                    setUserRole(roleData);
                    // Store role in localStorage as a properly formatted JSON string
                    if (roleData) {
                        const roleString = mapToLocalStorage(roleData);
                        localStorage.setItem("role", roleString);
                        setIsAdmin(roleData.name === 'ADMIN');
                    }
                    return roleData;
                })
                .then(role => {
                    // Get appropriate folder list based on role
                    console.warn(role);
                    const endpoint = role && role.name === 'ADMIN' ? "/nextcloud/files" : "/nextcloud/my-folders";
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
        }
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
                    isAdmin={isAdmin}
                    selectedFolderId={selectedFolderId}
                    maxFolderDepth={1}
                    onSearch={handleGlobalSearch}
                />
                <div className="content-area">
                    <FolderGrid
                        parentFolderId={selectedFolderId}
                        userRole={userRole || null}
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