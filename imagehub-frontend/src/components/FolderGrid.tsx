import React, { useState, useEffect, useRef } from "react";
import axiosInstance from "../utils/axiosInstance";
import "../styles/FolderGrid.css";
import ProductCard from "./ProductCard";
import { UserPermission, UserRole } from "../pages/PermissionManagement";
import { usePermissions } from '../contexts/PermissionContext';

// Interface for folder structure from Nextcloud API
interface Folder {
    name: string;
    path: string;
    isDirectory: boolean;
    contentType?: string;
    contentLength?: number;
    lastModified?: string;
    canWrite?: boolean;
    canDelete?: boolean;
    isProductFolder?: boolean;
    hasChildrenAsProducts?: boolean;
}

interface FolderGridProps {
    parentFolderId: string | null;
    userRole: UserRole | null;
    searchTerm?: string;
    isGlobalSearch?: boolean;
    searchResults?: Folder[];
}

const FolderGrid: React.FC<FolderGridProps> = ({
                                                   parentFolderId,
                                                   userRole,
                                                   searchTerm = "",
                                                   isGlobalSearch = false,
                                                   searchResults = []
                                               }) => {
    // Store previous parentFolderId to detect actual changes
    const previousParentFolderIdRef = useRef<string | null>(null);

    // State initialization with default showCurrentFolder=true
    const [items, setItems] = useState<Folder[]>([]);
    const [allItems, setAllItems] = useState<Folder[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");
    const [fileToUpload, setFileToUpload] = useState<File | null>(null);
    const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [sortOrder, setSortOrder] = useState<string>("newest");
    // Default to true to always show folder contents
    const [showCurrentFolder, setShowCurrentFolder] = useState<boolean>(false);
    const [showSortDropdown, setShowSortDropdown] = useState(false);
    const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
        const savedViewMode = localStorage.getItem('folderViewMode');
        return (savedViewMode === "list" || savedViewMode === "grid") ? savedViewMode : "grid";
    });
    const [selectedProductFolder, setSelectedProductFolder] = useState<string | null>(null);

    // Multi-selection feature states
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [selectionMode, setSelectionMode] = useState<boolean>(false);

    // Kontekst uprawnień
    const { permissions, hasPermission, canReadFolder, canWriteFolder, canDeleteFolder, canDownloadFolder } = usePermissions();

    // Check if user is admin
    const isAdmin = userRole?.name === 'ADMIN';

    // References for custom scrolling
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const scrollThumbRef = useRef<HTMLDivElement>(null);
    const scrollTrackRef = useRef<HTMLDivElement>(null);
    const [thumbHeight, setThumbHeight] = useState<number>(20);
    const [thumbTop, setThumbTop] = useState<number>(0);
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [startY, setStartY] = useState<number>(0);
    const [startTop, setStartTop] = useState<number>(0);

    // Sort options
    const sortOptions = [
        { value: "newest", label: "Najnowszych" },
        { value: "oldest", label: "Najstarszych" },
        { value: "nameAsc", label: "Nazwa A-Z" },
        { value: "nameDesc", label: "Nazwa Z-A" }
    ];

    // Function to load folder contents
    const loadFolderContents = (path: string | null) => {
        if (path === null) {
            console.warn("Path is null, skipping loading");
            return;
        }

        setLoading(true);
        setError(null);

        // Determine path - when path is null load root folders
        const folderPath = path !== null ? path : "";
        console.log("Fetching contents for path:", folderPath);

        axiosInstance
            .get(`/nextcloud/files`, {
                params: {
                    path: folderPath,
                    includeChildren: false,
                    depth: 1,
                }
            })
            .then(response => {
                // Save all items
                const allData = response.data;
                setAllItems(allData);

                // Set all items as visible (including current folder)
                setItems(allData);

                setLoading(false);

                // Update scrollbar after loading data
                updateScrollThumbHeight();
            })
            .catch(error => {
                console.error("Error fetching items:", error);
                setError("Nie udało się załadować zawartości folderu.");
                setLoading(false);
            });
    };

    // Effect to detect parentFolderId changes and force reload
    useEffect(() => {
        // console.log("useEffect [parentFolderId] triggered");
        // console.log("Previous parentFolderId:", previousParentFolderIdRef.current);
        // console.log("Current parentFolderId:", parentFolderId);

        // In global search mode, don't load folder contents
        if (isGlobalSearch) {
            // console.log("Global search mode, skipping folder loading");
            setItems(searchResults);
            setLoading(false);
            return;
        }

        // Check if parentFolderId actually changed
        if (parentFolderId !== previousParentFolderIdRef.current) {
            // console.log("Detected actual parentFolderId change, reloading data");

            // Clear items and allItems to show we're loading new content
            setItems([]);
            setAllItems([]);
            setLoading(true);

            // Load new folder contents
            if (parentFolderId !== null) {
                loadFolderContents(parentFolderId);
            } else {
                setLoading(false);
            }

            // Update reference to previous value
            previousParentFolderIdRef.current = parentFolderId;
        } else {
            // console.log("parentFolderId didn't change, skipping reload");
        }
    }, [parentFolderId, isGlobalSearch, searchResults]);

    // Effect for updating search results
    useEffect(() => {
        if (isGlobalSearch) {
            setItems(searchResults);
            setLoading(false);
        }
    }, [isGlobalSearch, searchResults]);

    // Effect that runs only once on component mount
    useEffect(() => {
        // console.log("FolderGrid - initial component initialization");
        // console.log("Initial parentFolderId:", parentFolderId);

        if (parentFolderId !== null && !isGlobalSearch) {
            // console.log("Initial loading of folder contents:", parentFolderId);
            loadFolderContents(parentFolderId);
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Effect to observe showCurrentFolder changes - update display
    useEffect(() => {
        // console.log("useEffect [showCurrentFolder, allItems] triggered");
        // console.log("showCurrentFolder:", showCurrentFolder);
        // console.log("allItems.length:", allItems.length);

        if (allItems.length > 0 && !isGlobalSearch) {
            handleToggleCurrentFolder(showCurrentFolder);
        }
    }, [showCurrentFolder, allItems, isGlobalSearch]);

    // Functions for handling custom scrollbar
    const updateScrollThumbHeight = () => {
        if (!scrollAreaRef.current || !scrollTrackRef.current) return;

        const scrollArea = scrollAreaRef.current;
        const trackHeight = scrollTrackRef.current.clientHeight;

        // Calculate thumb height proportion to track height
        const contentHeight = scrollArea.scrollHeight;
        const viewportHeight = scrollArea.clientHeight;
        const ratio = viewportHeight / contentHeight;

        // Minimum thumb height is 20px
        const height = Math.max(ratio * trackHeight, 20);
        setThumbHeight(height);
    };

    const updateScrollThumbPosition = () => {
        if (!scrollAreaRef.current || !scrollTrackRef.current) return;

        const scrollArea = scrollAreaRef.current;
        const trackHeight = scrollTrackRef.current.clientHeight;

        const contentHeight = scrollArea.scrollHeight;
        const viewportHeight = scrollArea.clientHeight;
        const scrollTop = scrollArea.scrollTop;

        // Calculate thumb position based on scroll
        const maxScrollTop = contentHeight - viewportHeight;
        const ratio = scrollTop / maxScrollTop;

        // Max thumb position is track height minus thumb height
        const maxThumbTop = trackHeight - thumbHeight;
        const thumbPosition = ratio * maxThumbTop;

        setThumbTop(maxScrollTop <= 0 ? 0 : thumbPosition);
    };

    const handleScrollAreaScroll = () => {
        updateScrollThumbPosition();
    };

    const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!scrollAreaRef.current || !scrollTrackRef.current || !scrollThumbRef.current) return;

        // Ignore click on thumb
        if (e.target === scrollThumbRef.current) return;

        const track = scrollTrackRef.current;
        const scrollArea = scrollAreaRef.current;

        const trackRect = track.getBoundingClientRect();
        const clickY = e.clientY - trackRect.top;

        // Scroll to corresponding position
        const contentHeight = scrollArea.scrollHeight;
        const viewportHeight = scrollArea.clientHeight;
        const maxScrollTop = contentHeight - viewportHeight;

        const trackHeight = track.clientHeight;
        const ratio = clickY / trackHeight;
        const scrollTo = ratio * maxScrollTop;

        scrollArea.scrollTop = scrollTo;
    };

    const handleThumbMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        setIsDragging(true);
        setStartY(e.clientY);
        setStartTop(thumbTop);

        // Add event listeners to the whole document
        document.addEventListener('mousemove', handleDocumentMouseMove);
        document.addEventListener('mouseup', handleDocumentMouseUp);
    };

    const handleDocumentMouseMove = (e: MouseEvent) => {
        if (!isDragging || !scrollAreaRef.current || !scrollTrackRef.current) return;

        const scrollArea = scrollAreaRef.current;
        const track = scrollTrackRef.current;

        const deltaY = e.clientY - startY;
        const trackHeight = track.clientHeight;

        // Calculate new thumb position with constraints
        const newThumbTop = Math.max(0, Math.min(startTop + deltaY, trackHeight - thumbHeight));

        // Calculate corresponding scroll position
        const contentHeight = scrollArea.scrollHeight;
        const viewportHeight = scrollArea.clientHeight;
        const maxScrollTop = contentHeight - viewportHeight;

        const ratio = newThumbTop / (trackHeight - thumbHeight);
        const scrollTo = ratio * maxScrollTop;

        scrollArea.scrollTop = scrollTo;
    };

    const handleDocumentMouseUp = () => {
        setIsDragging(false);

        // Remove document event listeners
        document.removeEventListener('mousemove', handleDocumentMouseMove);
        document.removeEventListener('mouseup', handleDocumentMouseUp);
    };

    // Effect initializing scrollbar
    useEffect(() => {
        // Update thumb height on window resize
        const handleResize = () => updateScrollThumbHeight();
        window.addEventListener('resize', handleResize);

        // Initialize scrollbar
        updateScrollThumbHeight();

        return () => {
            window.removeEventListener('resize', handleResize);
            document.removeEventListener('mousemove', handleDocumentMouseMove);
            document.removeEventListener('mouseup', handleDocumentMouseUp);
        };
    }, []);

    // Update thumb position after items list changes
    useEffect(() => {
        updateScrollThumbHeight();
    }, [items]);

    // FIXED: Improved filter and sort function for items
    const filterAndSortItems = () => {
        let filteredItems = items;

        // Apply search filter if not in global search
        if (searchTerm.trim() && !isGlobalSearch) {
            filteredItems = items.filter(item =>
                item.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Apply sorting
        return [...filteredItems].sort((a, b) => {
            switch (sortOrder) {
                case "nameAsc":
                    return a.name.localeCompare(b.name);
                case "nameDesc":
                    return b.name.localeCompare(a.name);
                case "newest":
                    // Sort by lastModified if available, newer first
                    if (a.lastModified && b.lastModified) {
                        return new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime();
                    }
                    return 0;
                case "oldest":
                    // Sort by lastModified if available, older first
                    if (a.lastModified && b.lastModified) {
                        return new Date(a.lastModified).getTime() - new Date(b.lastModified).getTime();
                    }
                    return 0;
                default:
                    return 0;
            }
        });
    };

    // Function to handle show current folder toggle
    const handleToggleCurrentFolder = (showCurrent: boolean) => {
        if (parentFolderId === null || allItems.length === 0) return;

        const path = parentFolderId;

        if (showCurrent) {
            // Show all items including current folder
            setItems(allItems);
        } else {
            // Filter out current folder
            const filteredItems = allItems.filter((item: Folder) => {
                if (path === '') return true;

                const currentFolderName = path.split('/').pop() || '';
                return !(item.path === path ||
                    (item.isDirectory && item.name === currentFolderName && path.endsWith(item.name)));
            });

            setItems(filteredItems);
        }
    };

    // Function to create new folder
    const createFolder = () => {
        if (!newFolderName.trim()) {
            setActionMessage({ type: 'error', text: 'Nazwa folderu nie może być pusta' });
            return;
        }

        const path = parentFolderId ? `${parentFolderId}/${newFolderName}` : newFolderName;

        axiosInstance
            .post('/nextcloud/directory', null, {
                params: {
                    path: path
                }
            })
            .then(() => {
                // Add new folder to list
                const newFolder: Folder = {
                    name: newFolderName,
                    path: path,
                    isDirectory: true,
                    canWrite: true,
                    canDelete: true
                };
                setAllItems([...allItems, newFolder]);

                // Filter and sort appropriately
                if (showCurrentFolder) {
                    setItems(prev => [...prev, newFolder].sort((a, b) => {
                        if (sortOrder === "nameAsc") return a.name.localeCompare(b.name);
                        else if (sortOrder === "nameDesc") return b.name.localeCompare(a.name);
                        return 0;
                    }));
                } else {
                    // Do nothing because new folder is not current folder
                    setItems(prev => [...prev, newFolder]);
                }

                setActionMessage({ type: 'success', text: 'Folder utworzony pomyślnie' });
                setShowCreateFolderModal(false);
                setNewFolderName("");
            })
            .catch(error => {
                console.error("Error creating folder:", error);
                setActionMessage({ type: 'error', text: `Błąd podczas tworzenia folderu: ${error.response?.data || 'Nieznany błąd'}` });
            });
    };

    // FIXED: Improved file upload function
    const uploadFile = () => {
        if (!fileToUpload) {
            setActionMessage({ type: 'error', text: 'Wybierz plik do przesłania' });
            return;
        }

        const formData = new FormData();
        formData.append('file', fileToUpload);
        formData.append('path', parentFolderId || '');

        setActionMessage({ type: 'success', text: 'Przesyłanie pliku...' });

        axiosInstance
            .post('/nextcloud/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            })
            .then(() => {
                // Add uploaded file to list
                const newFile: Folder = {
                    name: fileToUpload.name,
                    path: parentFolderId ? `${parentFolderId}/${fileToUpload.name}` : fileToUpload.name,
                    isDirectory: false,
                    contentType: fileToUpload.type,
                    contentLength: fileToUpload.size,
                    lastModified: new Date().toISOString(),
                    canWrite: true,
                    canDelete: true
                };

                setAllItems([...allItems, newFile]);
                setItems(prev => [...prev, newFile]);

                setActionMessage({ type: 'success', text: 'Plik przesłany pomyślnie' });
                setShowUploadModal(false);
                setFileToUpload(null);
            })
            .catch(error => {
                console.error("Error uploading file:", error);
                setActionMessage({ type: 'error', text: `Błąd podczas przesyłania pliku: ${error.response?.data || 'Nieznany błąd'}` });
            });
    };

    const hasDownload = (item: any): boolean => {
        if (!item) return false;

        // Check if permissions are still loading
        if (permissions.isLoading) {
            console.log('Permissions still loading in hasDownload function');
            return false; // Default to false while loading
        }

        // Administrators always have permissions
        if (userRole?.name === 'ADMIN') return true;

        // Check global download permission
        if (hasPermission('files_download')) {
            console.log('User has global download permission');
            return true;
        }

        // Check folder-specific download permissions
        if (canDownloadFolder && typeof canDownloadFolder === 'function') {
            const result = canDownloadFolder(item.path);
            console.log(`Download permission for folder ${item.path}: ${result}`);
            return result;
        }

        // Fallback to read permission
        return hasRead(item);
    };

    // FIXED: Improved delete function with better error handling
    const deleteItem = (item: Folder) => {
        // Sprawdź uprawnienia przed usunięciem
        if (!hasDelete(item)) {
            setActionMessage({ type: 'error', text: `Brak uprawnień do usunięcia ${item.isDirectory ? 'folderu' : 'pliku'}` });
            return;
        }

        if (!window.confirm(`Czy na pewno chcesz usunąć ${item.isDirectory ? 'folder' : 'plik'} ${item.name}?`)) {
            return;
        }

        setActionMessage({ type: 'success', text: `Usuwanie ${item.isDirectory ? 'folderu' : 'pliku'}...` });

        axiosInstance
            .delete(`/nextcloud/files`,  {params:{
                    file: item.path,
                }})
            .then(() => {
                // Remove item from lists
                setAllItems(allItems.filter(i => i.path !== item.path));
                setItems(items.filter(i => i.path !== item.path));

                // Remove from selection if in selection mode
                if (selectionMode && selectedItems.has(item.path)) {
                    const newSelection = new Set(selectedItems);
                    newSelection.delete(item.path);
                    setSelectedItems(newSelection);
                }

                setActionMessage({ type: 'success', text: `${item.isDirectory ? 'Folder' : 'Plik'} usunięty pomyślnie` });
            })
            .catch(error => {
                console.error("Error deleting item:", error);
                let errorMessage = "Błąd podczas usuwania";

                if (error.response) {
                    if (error.response.status === 403) {
                        errorMessage = `Brak uprawnień do usunięcia ${item.isDirectory ? 'folderu' : 'pliku'}`;
                    } else {
                        errorMessage += `: ${error.response.data || error.response.status}`;
                    }
                } else if (error.request) {
                    errorMessage += ": Brak odpowiedzi z serwera";
                } else {
                    errorMessage += `: ${error.message}`;
                }

                setActionMessage({ type: 'error', text: errorMessage });
            });
    };
// Funkcja do pobierania pliku
    const downloadFile = (item: Folder) => {
        // Sprawdź uprawnienia przed pobraniem - używamy nowej funkcji hasDownload

        if (permissions.isLoading) {
            setActionMessage({ type: 'error', text: "Ładowanie uprawnień, spróbuj za chwilę..." });
            return;
        }

        if (!hasDownload(item)) {
            setActionMessage({ type: 'error', text: "Brak uprawnień do pobrania pliku" });
            return;
        }

        setActionMessage({ type: 'success', text: "Przygotowywanie pliku do pobrania..." });

        axiosInstance
            .get(`/nextcloud/files/download`, {
                params: {
                    file: item.path,
                },
                responseType: 'blob'
            })
            .then(response => {
                // Utworzenie Blob z danych odpowiedzi
                const blob = new Blob([response.data], {
                    type: item.contentType || 'application/octet-stream'
                });

                // Utworzenie URL dla Blob
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', item.name);

                // Symulacja kliknięcia, aby rozpocząć pobieranie
                document.body.appendChild(link);
                link.click();

                // Czyszczenie po pobraniu
                setTimeout(() => {
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(url);
                    setActionMessage({ type: 'success', text: "Plik pobrany pomyślnie" });

                    // Ukryj komunikat po 3 sekundach
                    setTimeout(() => {
                        setActionMessage(null);
                    }, 3000);
                }, 100);
            })
            .catch(error => {
                console.error("Error downloading file:", error);

                let errorMessage = "Błąd podczas pobierania pliku";

                if (error.response) {
                    if (error.response.status === 403) {
                        errorMessage = "Brak uprawnień do pobrania pliku";
                    } else {
                        errorMessage += `: ${error.response.status} - ${error.response.statusText}`;
                    }
                } else if (error.request) {
                    errorMessage += ": Brak odpowiedzi z serwera";
                } else {
                    errorMessage += `: ${error.message}`;
                }

                setActionMessage({ type: 'error', text: errorMessage });
            });
    };

// Funkcja do pobierania folderu jako zip
    const downloadFolder = (item: Folder) => {

        if (permissions.isLoading) {
            setActionMessage({ type: 'error', text: "Ładowanie uprawnień, spróbuj za chwilę..." });
            return;
        }

        // Sprawdź uprawnienia przed pobraniem - używamy nowej funkcji hasDownload
        if (!hasDownload(item)) {
            setActionMessage({ type: 'error', text: "Brak uprawnień do pobrania folderu" });
            return;
        }

        // Wyświetl komunikat o przygotowywaniu pobierania
        setActionMessage({ type: 'success', text: "Przygotowywanie folderu do pobrania..." });

        axiosInstance
            .get(`/nextcloud/files/download-zip`, {
                params: {
                    file: item.path,
                },
                responseType: 'blob'
            })
            .then(response => {
                // Utworzenie linku do pobrania pliku zip
                const url = window.URL.createObjectURL(new Blob([response.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `${item.name}.zip`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                // Wyczyść komunikat po udanym pobraniu
                setTimeout(() => {
                    setActionMessage(null);
                }, 3000);
            })
            .catch(error => {
                console.error("Error downloading folder:", error);

                let errorMessage = "Błąd podczas pobierania folderu";

                if (error.response) {
                    if (error.response.status === 403) {
                        errorMessage = "Brak uprawnień do pobrania folderu";
                    } else {
                        errorMessage += `: ${error.response.status} - ${error.response.statusText}`;
                    }
                } else if (error.request) {
                    errorMessage += ": Brak odpowiedzi z serwera";
                } else {
                    errorMessage += `: ${error.message}`;
                }

                setActionMessage({ type: 'error', text: errorMessage });
            });
    };
    // // FIXED: Improved file download function
    // const downloadFile = (item: Folder) => {
    //     // Sprawdź uprawnienia przed pobraniem
    //     if (!hasRead(item)) {
    //         setActionMessage({ type: 'error', text: "Brak uprawnień do pobrania pliku" });
    //         return;
    //     }
    //
    //     setActionMessage({ type: 'success', text: "Przygotowywanie pliku do pobrania..." });
    //
    //     axiosInstance
    //         .get(`/nextcloud/files/download`,  {
    //             params: {
    //                 file: item.path,
    //             },
    //             responseType: 'blob'
    //         })
    //         .then(response => {
    //             // Pozostała część funkcji bez zmian
    //             const blob = new Blob([response.data], {
    //                 type: item.contentType || 'application/octet-stream'
    //             });
    //
    //             const url = window.URL.createObjectURL(blob);
    //             const link = document.createElement('a');
    //             link.href = url;
    //             link.setAttribute('download', item.name);
    //
    //             document.body.appendChild(link);
    //             link.click();
    //
    //             setTimeout(() => {
    //                 document.body.removeChild(link);
    //                 window.URL.revokeObjectURL(url);
    //                 setActionMessage({ type: 'success', text: "Plik pobrany pomyślnie" });
    //
    //                 setTimeout(() => {
    //                     setActionMessage(null);
    //                 }, 3000);
    //             }, 100);
    //         })
    //         .catch(error => {
    //             console.error("Error downloading file:", error);
    //
    //             let errorMessage = "Błąd podczas pobierania pliku";
    //
    //             if (error.response) {
    //                 if (error.response.status === 403) {
    //                     errorMessage = "Brak uprawnień do pobrania pliku";
    //                 } else {
    //                     errorMessage += `: ${error.response.status} - ${error.response.statusText}`;
    //                 }
    //             } else if (error.request) {
    //                 errorMessage += ": Brak odpowiedzi z serwera";
    //             } else {
    //                 errorMessage += `: ${error.message}`;
    //             }
    //
    //             setActionMessage({ type: 'error', text: errorMessage });
    //         });
    // };
    //
    // // Funkcja do pobierania folderu jako zip
    // const downloadFolder = (item: Folder) => {
    //     // Sprawdź uprawnienia przed pobraniem
    //     if (!hasRead(item)) {
    //         setActionMessage({ type: 'error', text: "Brak uprawnień do pobrania folderu" });
    //         return;
    //     }
    //
    //     // Display message about preparing download
    //     setActionMessage({ type: 'success', text: "Przygotowywanie folderu do pobrania..." });
    //
    //     axiosInstance
    //         .get(`/nextcloud/files/download-zip`,  {
    //             params: {
    //                 file: item.path,
    //             },
    //             responseType: 'blob'
    //         })
    //         .then(response => {
    //             // Create a download link for the zip file
    //             const url = window.URL.createObjectURL(new Blob([response.data]));
    //             const link = document.createElement('a');
    //             link.href = url;
    //             link.setAttribute('download', `${item.name}.zip`);
    //             document.body.appendChild(link);
    //             link.click();
    //             document.body.removeChild(link);
    //
    //             // Clear message after successful download
    //             setTimeout(() => {
    //                 setActionMessage(null);
    //             }, 3000);
    //         })
    //         .catch(error => {
    //             console.error("Error downloading folder:", error);
    //
    //             let errorMessage = "Błąd podczas pobierania folderu";
    //
    //             if (error.response) {
    //                 if (error.response.status === 403) {
    //                     errorMessage = "Brak uprawnień do pobrania folderu";
    //                 } else {
    //                     errorMessage += `: ${error.response.status} - ${error.response.statusText}`;
    //                 }
    //             } else if (error.request) {
    //                 errorMessage += ": Brak odpowiedzi z serwera";
    //             } else {
    //                 errorMessage += `: ${error.message}`;
    //             }
    //
    //             setActionMessage({ type: 'error', text: errorMessage });
    //         });
    // };

    // Function to toggle view mode (grid/list) with localStorage save
    const toggleViewMode = () => {
        const newViewMode = viewMode === "grid" ? "list" : "grid";
        setViewMode(newViewMode);
        // Save user preference in localStorage
        localStorage.setItem('folderViewMode', newViewMode);
    };

    // NEW FEATURE: Multi-selection functions
    // Function to toggle selection mode
    const toggleSelectionMode = () => {
        // Clear selections when exiting selection mode
        if (selectionMode) {
            setSelectedItems(new Set());
        }
        setSelectionMode(!selectionMode);
    };

    // Function to handle item selection
    const toggleItemSelection = (itemPath: string, event: React.MouseEvent) => {
        event.stopPropagation(); // Prevent other click handlers

        setSelectedItems(prevSelectedItems => {
            const newSelectedItems = new Set(prevSelectedItems);
            if (newSelectedItems.has(itemPath)) {
                newSelectedItems.delete(itemPath);
            } else {
                newSelectedItems.add(itemPath);
            }
            return newSelectedItems;
        });
    };

    // Function to select all items
    const selectAllItems = () => {
        const displayedItems = filterAndSortItems();

        if (selectedItems.size === displayedItems.length) {
            // If all are selected, deselect all
            setSelectedItems(new Set());
        } else {
            // Otherwise, select all
            const allPaths = new Set(displayedItems.map(item => item.path));
            setSelectedItems(allPaths);
        }
    };

    // // Function to download all selected items
    // const downloadSelectedItems = () => {
    //     // If only one item is selected, download it directly
    //     if (selectedItems.size === 1) {
    //         const itemPath = Array.from(selectedItems)[0];
    //         const item = items.find(i => i.path === itemPath);
    //         if (item) {
    //             if (item.isDirectory) {
    //                 downloadFolder(item);
    //             } else {
    //                 downloadFile(item);
    //             }
    //         }
    //         return;
    //     }
    //
    //     // For multiple items, inform the user
    //     setActionMessage({
    //         type: 'success',
    //         text: `Przygotowywanie ${selectedItems.size} elementów do pobrania...`
    //     });
    //
    //     // Download items one by one
    //     const selectedItemsList = filterAndSortItems().filter(item =>
    //         selectedItems.has(item.path)
    //     );
    //
    //     // Download each item with a delay to avoid browser limitations
    //     selectedItemsList.forEach((item, index) => {
    //         setTimeout(() => {
    //             if (item.isDirectory) {
    //                 downloadFolder(item);
    //             } else {
    //                 downloadFile(item);
    //             }
    //         }, index * 1000); // 1 second delay between downloads
    //     });
    // };

    // Funkcja do pobierania wielu zaznaczonych elementów
    const downloadSelectedItems = () => {
        // Jeśli tylko jeden element jest zaznaczony, pobierz go bezpośrednio
        if (selectedItems.size === 1) {
            const itemPath = Array.from(selectedItems)[0];
            const item = items.find(i => i.path === itemPath);
            if (item) {
                if (item.isDirectory) {
                    downloadFolder(item);
                } else {
                    downloadFile(item);
                }
            }
            return;
        }

        // Dla wielu elementów, poinformuj użytkownika
        setActionMessage({
            type: 'success',
            text: `Przygotowywanie ${selectedItems.size} elementów do pobrania...`
        });

        // Utwórz tablicę ścieżek do pobrania
        const selectedItemsList = filterAndSortItems().filter(item =>
            selectedItems.has(item.path)
        );

        const selectedPaths = selectedItemsList.map(item => item.path);

        // Sprawdź uprawnienia przed pobraniem
        if (permissions.isLoading) {
            setActionMessage({ type: 'error', text: "Ładowanie uprawnień, spróbuj za chwilę..." });
            return;
        }

        // Sprawdź uprawnienia dla wszystkich elementów
        const hasPermissionForAll = selectedItemsList.every(item => hasDownload(item));
        if (!hasPermissionForAll) {
            setActionMessage({ type: 'error', text: "Brak uprawnień do pobrania niektórych wybranych elementów" });
            return;
        }

        // Wywołaj endpoint API, który pobierze wiele plików/folderów jako jeden ZIP
        axiosInstance
            .post('/nextcloud/files/download-multiple', {
                paths: selectedPaths
            }, {
                responseType: 'blob'
            })
            .then(response => {
                // Utworzenie linku do pobrania pliku zip
                const url = window.URL.createObjectURL(new Blob([response.data]));
                const link = document.createElement('a');
                link.href = url;

                // Użyj nazwy zawierającej liczbę elementów
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                link.setAttribute('download', `wybrane-elementy-${selectedItems.size}-${timestamp}.zip`);

                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                // Wyczyść komunikat po udanym pobraniu
                setTimeout(() => {
                    setActionMessage({ type: 'success', text: "Pobieranie zakończone pomyślnie" });

                    // Ukryj komunikat po 3 sekundach
                    setTimeout(() => {
                        setActionMessage(null);
                    }, 3000);
                }, 1000);
            })
            .catch(error => {
                console.error("Błąd podczas pobierania wielu elementów:", error);

                let errorMessage = "Błąd podczas pobierania elementów";

                if (error.response) {
                    if (error.response.status === 403) {
                        errorMessage = "Brak uprawnień do pobrania wybranych elementów";
                    } else {
                        errorMessage += `: ${error.response.status} - ${error.response.statusText}`;
                    }
                } else if (error.request) {
                    errorMessage += ": Brak odpowiedzi z serwera";
                } else {
                    errorMessage += `: ${error.message}`;
                }

                setActionMessage({ type: 'error', text: errorMessage });
            });
    };

    // Function to delete all selected items
    const deleteSelectedItems = () => {
        if (!window.confirm(`Czy na pewno chcesz usunąć ${selectedItems.size} wybranych elementów?`)) {
            return;
        }

        const selectedItemsList = filterAndSortItems().filter(item =>
            selectedItems.has(item.path)
        );

        setActionMessage({
            type: 'success',
            text: `Usuwanie ${selectedItems.size} elementów...`
        });

        // Delete each item with a delay
        let deletedCount = 0;
        let errorCount = 0;

        selectedItemsList.forEach((item, index) => {
            setTimeout(() => {
                // Encode the path to handle special characters
                const encodedPath = encodeURIComponent(item.path);

                axiosInstance
                    .delete(`/nextcloud/files`,  {params:{
                            file:item.path,
                        }})
                    .then(() => {
                        deletedCount++;
                        // Remove from state
                        setAllItems(prev => prev.filter(i => i.path !== item.path));
                        setItems(prev => prev.filter(i => i.path !== item.path));

                        // Update message on completion
                        if (deletedCount + errorCount === selectedItems.size) {
                            if (errorCount > 0) {
                                setActionMessage({
                                    type: 'error',
                                    text: `Usunięto ${deletedCount} z ${selectedItems.size} elementów. ${errorCount} błędów.`
                                });
                            } else {
                                setActionMessage({
                                    type: 'success',
                                    text: `Usunięto pomyślnie ${deletedCount} elementów.`
                                });
                                // Clear selections
                                setSelectedItems(new Set());
                            }
                        }
                    })
                    .catch(error => {
                        errorCount++;
                        console.error(`Error deleting item ${item.path}:`, error);

                        // Update message on completion
                        if (deletedCount + errorCount === selectedItems.size) {
                            setActionMessage({
                                type: 'error',
                                text: `Usunięto ${deletedCount} z ${selectedItems.size} elementów. ${errorCount} błędów.`
                            });
                        }
                    });
            }, index * 300); // 300ms delay between delete operations
        });
    };

    // Sprawdzenie uprawnień usuwania
    const hasDelete = (item: any): boolean => {
        if (!item) return false;

        // Użytkownik admin zawsze ma uprawnienia
        if (userRole?.name === 'ADMIN') return true;

        // Sprawdź zarówno uprawnienie globalne jak i uprawnienie do własnych plików
        const hasGlobalDelete = hasPermission("files_delete");
        const hasOwnDelete = hasPermission("files_delete_own");

        // Sprawdź, czy folder może być usunięty przez tego użytkownika
        return (hasGlobalDelete || hasOwnDelete) && canDeleteFolder(item.path);
    };

// Sprawdzenie uprawnień zapisu
    const hasWrite = (item: any): boolean => {
        if (!item) return false;

        // Użytkownik admin zawsze ma uprawnienia
        if (userRole?.name === 'ADMIN') return true;

        // Sprawdź zarówno uprawnienie globalne jak i uprawnienie do własnych plików
        const hasGlobalWrite = hasPermission("files_write");
        const hasOwnWrite = hasPermission("files_write_own");

        // Sprawdź, czy folder może być modyfikowany przez tego użytkownika
        return (hasGlobalWrite || hasOwnWrite) && canWriteFolder(item.path);
    };

// Sprawdzenie uprawnień odczytu
    const hasRead = (item: any): boolean => {
        if (!item) return false;

        // Użytkownik admin zawsze ma uprawnienia
        if (userRole?.name === 'ADMIN') return true;

        // Sprawdź uprawnienie odczytu
        const hasReadPerm = hasPermission("files_read");

        // Sprawdź, czy folder może być odczytany przez tego użytkownika
        return hasReadPerm && canReadFolder(item.path);
    };

    // Render component
    return (
        <div className="product-grid-container">
            {/* Top toolbar */}
            <div className="filter-controls">
                {/* Show current folder toggle - visible only when not in global search */}
                {!isGlobalSearch && (
                    <div className="toggle-container">
                        <label className="toggle-switch">
                            <input
                                type="checkbox"
                                checked={showCurrentFolder}
                                onChange={() => {
                                    setShowCurrentFolder(!showCurrentFolder);
                                    // Immediate application of change
                                    handleToggleCurrentFolder(!showCurrentFolder);
                                }}
                            />
                            <span className="slider"></span>
                        </label>
                        <span className="toggle-label">Pokaż bieżący folder</span>
                    </div>
                )}

                {/* Search results header - visible only in global search mode */}
                {isGlobalSearch && searchTerm && (
                    <div className="search-results-header">
                        <h3>Wyniki wyszukiwania dla: "{searchTerm}"</h3>
                        <span className="results-count">Znaleziono elementów: {searchResults.length}</span>
                    </div>
                )}

                {/* Sort dropdown - always visible */}
                <div className="sort-dropdown">
                    <div
                        className="sort-dropdown-header"
                        onClick={() => setShowSortDropdown(!showSortDropdown)}
                    >
                        <span>Sortuj: {sortOptions.find(option => option.value === sortOrder)?.label}</span>
                        <span className="dropdown-arrow">{showSortDropdown ? '▲' : '▼'}</span>
                    </div>
                    {showSortDropdown && (
                        <div className="sort-dropdown-content">
                            {sortOptions.map(option => (
                                <div
                                    key={option.value}
                                    className={`sort-option ${sortOrder === option.value ? 'active' : ''}`}
                                    onClick={() => {
                                        setSortOrder(option.value);
                                        setShowSortDropdown(false);
                                    }}
                                >
                                    {option.label}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Clear search button - visible only in global search mode */}
                {isGlobalSearch && (
                    <button
                        className="clear-search-btn"
                        onClick={() => {
                            // Reset search and return to normal view
                            window.location.href = parentFolderId ? `/dashboard?folder=${parentFolderId}` : '/dashboard';
                        }}
                    >
                        Wyczyść wyszukiwanie
                    </button>
                )}

                {/* Action buttons - visible only if user has write permissions and not in global search mode */}
                {hasPermission("files_write") && !isGlobalSearch && parentFolderId && hasWrite({path: parentFolderId}) && (
                    <div className="action-buttons">
                        <button
                            className="action-btn new-folder-btn"
                            onClick={() => setShowCreateFolderModal(true)}
                        >
                            Nowy folder
                        </button>
                        <button
                            className="action-btn upload-btn"
                            onClick={() => setShowUploadModal(true)}
                        >
                            Dodaj plik
                        </button>
                    </div>
                )}

                {/* View mode toggle (grid/list) */}
                <div className="view-mode-toggle">
                    <button
                        className={`view-mode-btn ${viewMode === "grid" ? "active" : ""}`}
                        onClick={toggleViewMode}
                        title={viewMode === "grid" ? "Przełącz na widok listy" : "Przełącz na widok kafelków"}
                    >
                        {viewMode === "grid" ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="8" y1="6" x2="21" y2="6"></line>
                                <line x1="8" y1="12" x2="21" y2="12"></line>
                                <line x1="8" y1="18" x2="21" y2="18"></line>
                                <line x1="3" y1="6" x2="3.01" y2="6"></line>
                                <line x1="3" y1="12" x2="3.01" y2="12"></line>
                                <line x1="3" y1="18" x2="3.01" y2="18"></line>
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="7" height="7"></rect>
                                <rect x="14" y="3" width="7" height="7"></rect>
                                <rect x="14" y="14" width="7" height="7"></rect>
                                <rect x="3" y="14" width="7" height="7"></rect>
                            </svg>
                        )}
                    </button>

                    {/* NEW FEATURE: Selection mode toggle button */}
                    <button
                        className={`select-mode-btn ${selectionMode ? "active" : ""}`}
                        onClick={toggleSelectionMode}
                        title={selectionMode ? "Wyłącz tryb zaznaczania" : "Włącz tryb zaznaczania"}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            {selectionMode && <polyline points="9 11 12 14 22 4"></polyline>}
                        </svg>
                    </button>
                </div>
            </div>

            {/* NEW FEATURE: Selection toolbar */}
            {selectionMode && (
                <div className="selection-toolbar">
                    <button
                        className="select-all-btn"
                        onClick={selectAllItems}
                    >
                        {selectedItems.size === filterAndSortItems().length
                            ? "Odznacz wszystkie"
                            : "Zaznacz wszystkie"}
                    </button>
                    <span className="selection-count">
                        Zaznaczono: {selectedItems.size}
                    </span>
                    {selectedItems.size > 0 && (
                        <>
                            <button
                                className="download-selected-btn"
                                onClick={downloadSelectedItems}
                            >
                                {selectedItems.size === 1 ? "Pobierz plik" : "Pobierz wszystkie"}
                            </button>
                            {hasPermission("files_delete") && (
                                <button
                                    className="delete-selected-btn"
                                    onClick={deleteSelectedItems}
                                >
                                    {selectedItems.size === 1 ? "Usuń element" : "Usuń wybrane"}
                                </button>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* Action message */}
            {actionMessage && (
                <div className={`action-message ${actionMessage.type}`}>
                    {actionMessage.text}
                    <button onClick={() => setActionMessage(null)}>×</button>
                </div>
            )}

            {/* Loading */}
            {loading && <div className="loading">Ładowanie zawartości...</div>}

            {/* Error */}
            {error && <div className="error">{error}</div>}

            {/* No folder selected */}
            {!parentFolderId && !isGlobalSearch && !loading && !error && (
                <div className="no-folder-selected">
                    <p>Wybierz folder z panelu po lewej stronie</p>
                </div>
            )}

            {/* Container with file grid and custom scrollbar */}
            {(parentFolderId || isGlobalSearch) && !loading && !error && (
                <div className="product-grid-scroll-container">
                    {/* Scroll area with grid */}
                    <div
                        className="product-grid-scroll-area"
                        ref={scrollAreaRef}
                        onScroll={handleScrollAreaScroll}
                    >
                        {viewMode === "grid" ? (
                            // Grid view
                            <div className="product-grid">
                                {filterAndSortItems().length === 0 ? (
                                    <div className="empty-folder">
                                        <p>{isGlobalSearch ? "Nie znaleziono wyników wyszukiwania" : (searchTerm ? "Nie znaleziono pasujących elementów" : "Ten folder jest pusty")}</p>
                                    </div>
                                ) : (
                                    filterAndSortItems().map((item) => (
                                        <div
                                            key={item.path}
                                            className={`product-card ${selectedItems.has(item.path) ? 'selected' : ''}`}
                                        >
                                            {/* NEW FEATURE: Selection checkbox in grid view */}
                                            {selectionMode && (
                                                <div className="checkbox-container" onClick={(e) => toggleItemSelection(item.path, e)}>
                                                    <input
                                                        type="checkbox"
                                                        className="item-checkbox"
                                                        checked={selectedItems.has(item.path)}
                                                        onChange={() => {}} // Handling in onClick of container
                                                    />
                                                </div>
                                            )}
                                            <div className="product-image">
                                                {item.isDirectory ? (
                                                    <img src="/placeholder-folder.png" alt="Folder" className="folder-img" />
                                                ) : (
                                                    <img src="/placeholder-image.png" alt="Product" />
                                                )}
                                            </div>
                                            <div className="product-details">
                                                <h3 className="product-name">
                                                    {item.name}
                                                </h3>
                                                <div className="product-sku-list">
                                                    {item.isDirectory ? (
                                                        item.isProductFolder ? (
                                                            <p>Produkt</p>
                                                        ) : (
                                                            <p>Folder</p>
                                                        )
                                                    ) : (
                                                        <p>Plik</p>
                                                    )}
                                                </div>
                                                <div className="product-actions">
                                                    {item.isDirectory ? (
                                                        // Dla folderów
                                                        <>
                                                            <button
                                                                className="btn-open"
                                                                onClick={() => {
                                                                    // Jeśli to folder produktowy (i NIE jest oznaczony jako mający dzieci-produkty)
                                                                    // Zawsze pokazujemy kartę produktu - usunięto sprawdzanie hasRead
                                                                    if (item.isProductFolder && !item.hasChildrenAsProducts) {
                                                                        console.log("This is a product folder, showing product card");
                                                                        setSelectedProductFolder(item.path);
                                                                    } else {
                                                                        // W przeciwnym razie przejdź do folderu (normalny folder lub folder z dziećmi-produktami)
                                                                        window.location.href = `/dashboard?folder=${item.path}`;
                                                                    }
                                                                }}
                                                            >
                                                                {item.isProductFolder && !item.hasChildrenAsProducts ? "Pokaż produkt" : "Otwórz"}
                                                            </button>
                                                            <button
                                                                className="btn-download"
                                                                onClick={() => downloadFolder(item)}
                                                            >
                                                                Pobierz
                                                            </button>
                                                            {hasDelete(item) && (
                                                                <button
                                                                    className="btn-delete"
                                                                    onClick={() => deleteItem(item)}
                                                                >
                                                                    Usuń
                                                                </button>
                                                            )}
                                                        </>
                                                    ) : (
                                                        // For files
                                                        <>
                                                            <button
                                                                className="btn-download"
                                                                onClick={() => downloadFile(item)}
                                                            >
                                                                Pobierz
                                                            </button>
                                                            {hasDelete(item) && (
                                                                <button
                                                                    className="btn-delete"
                                                                    onClick={() => deleteItem(item)}
                                                                >
                                                                    Usuń
                                                                </button>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        ) : (
                            // List view
                            <div className="product-list">
                                {filterAndSortItems().length === 0 ? (
                                    <div className="empty-folder">
                                        <p>{isGlobalSearch ? "Nie znaleziono wyników wyszukiwania" : (searchTerm ? "Nie znaleziono pasujących elementów" : "Ten folder jest pusty")}</p>
                                    </div>
                                ) : (
                                    <table className="list-view-table">
                                        <tbody>
                                        {filterAndSortItems().map((item) => (
                                            <tr
                                                key={item.path}
                                                className={`list-item ${selectedItems.has(item.path) ? 'selected' : ''}`}
                                            >
                                                {/* NEW FEATURE: Selection checkbox in list view */}
                                                {selectionMode && (
                                                    <td
                                                        className="list-item-checkbox"
                                                        onClick={(e) => toggleItemSelection(item.path, e)}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            className="item-checkbox"
                                                            checked={selectedItems.has(item.path)}
                                                            onChange={() => {}} // Handling in onClick of container
                                                        />
                                                    </td>
                                                )}
                                                <td className="list-item-icon">
                                                    {item.isDirectory ? (
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                                                        </svg>
                                                    ) : (
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                                            <polyline points="14 2 14 8 20 8"></polyline>
                                                            <line x1="16" y1="13" x2="8" y2="13"></line>
                                                            <line x1="16" y1="17" x2="8" y2="17"></line>
                                                            <polyline points="10 9 9 9 8 9"></polyline>
                                                        </svg>
                                                    )}
                                                </td>
                                                <td className="list-item-name">{item.name}</td>
                                                <td className="list-item-type">{item.isDirectory ? (
                                                    item.isProductFolder ? "Produkt" : "Folder"
                                                ) : "Plik"}
                                                </td>
                                                <td className="list-item-actions">
                                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '5px' }}>
                                                        {item.isDirectory ? (
                                                            // For folders
                                                            <>
                                                                <button
                                                                    className="btn-open list-btn"
                                                                    onClick={() => {
                                                                        // Zawsze pokazujemy kartę produktu dla folderów produktowych - usunięto sprawdzanie hasRead
                                                                        if (item.isProductFolder && !item.hasChildrenAsProducts) {
                                                                            setSelectedProductFolder(item.path);
                                                                        } else {
                                                                            // Direct redirect with page reload
                                                                            window.location.href = `/dashboard?folder=${item.path}`;
                                                                        }
                                                                    }}
                                                                    style={{ display: 'inline-block' }}
                                                                >
                                                                    {item.isProductFolder && !item.hasChildrenAsProducts ? "Pokaż produkt" : "Otwórz"}
                                                                </button>
                                                                <button
                                                                    className="btn-download list-btn"
                                                                    onClick={() => downloadFolder(item)}
                                                                    style={{ display: 'inline-block' }}
                                                                >
                                                                    Pobierz
                                                                </button>
                                                                {hasDelete(item) && (
                                                                    <button
                                                                        className="btn-delete list-btn"
                                                                        onClick={() => deleteItem(item)}
                                                                        style={{ display: 'inline-block' }}
                                                                    >
                                                                        Usuń
                                                                    </button>
                                                                )}
                                                            </>
                                                        ) : (
                                                            // For files
                                                            <>
                                                                <button
                                                                    className="btn-download list-btn"
                                                                    onClick={() => downloadFile(item)}
                                                                    style={{ display: 'inline-block' }}
                                                                >
                                                                    Pobierz
                                                                </button>
                                                                {hasDelete(item) && (
                                                                    <button
                                                                        className="btn-delete list-btn"
                                                                        onClick={() => deleteItem(item)}
                                                                        style={{ display: 'inline-block' }}
                                                                    >
                                                                        Usuń
                                                                    </button>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Custom scrollbar */}
                    <div
                        className="custom-scrollbar"
                        ref={scrollTrackRef}
                        onClick={handleTrackClick}
                    >
                        <div className="scrollbar-track"></div>
                        <div
                            className="scrollbar-thumb"
                            ref={scrollThumbRef}
                            style={{
                                height: `${thumbHeight}px`,
                                top: `${thumbTop}px`
                            }}
                            onMouseDown={handleThumbMouseDown}
                        ></div>
                    </div>
                </div>
            )}

            {/* Create folder modal */}
            {showCreateFolderModal && (
                <div className="modal">
                    <div className="modal-content">
                        <h3>Utwórz nowy folder</h3>
                        <input
                            type="text"
                            placeholder="Nazwa folderu"
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                        />
                        <div className="modal-actions">
                            <button onClick={createFolder}>Utwórz</button>
                            <button onClick={() => {
                                setShowCreateFolderModal(false);
                                setNewFolderName("");
                            }}>Anuluj</button>
                        </div>
                    </div>
                </div>
            )}
            {selectedProductFolder && (
                <ProductCard
                    folderPath={selectedProductFolder}
                    onClose={() => setSelectedProductFolder(null)}
                />
            )}
            {/* Upload file modal */}
            {showUploadModal && (
                <div className="modal">
                    <div className="modal-content">
                        <h3>Prześlij plik</h3>
                        <input
                            type="file"
                            onChange={(e) => setFileToUpload(e.target.files?.[0] || null)}
                        />
                        <div className="modal-actions">
                            <button onClick={uploadFile} disabled={!fileToUpload}>Prześlij</button>
                            <button onClick={() => {
                                setShowUploadModal(false);
                                setFileToUpload(null);
                            }}>Anuluj</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FolderGrid;