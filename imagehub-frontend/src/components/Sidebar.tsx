import React, { useState, useEffect } from "react";
import "../styles/Sidebar.css";
import axiosInstance from "../utils/axiosInstance";

interface Folder {
    path: string;
    name: string;
    isDirectory: boolean;
    children?: Folder[];
    canWrite?: boolean;
    canDelete?: boolean;
}

interface SidebarProps {
    folders: Folder[];
    setSelectedFolderId: (path: string | null) => void;
    isAdmin: boolean;
    selectedFolderId: string | null;
    maxFolderDepth?: number; // Opcjonalny prop do konfigurowania maksymalnej głębokości
    onSearch?: (searchTerm: string) => void; // Nowy prop do obsługi wyszukiwania
}

const Sidebar: React.FC<SidebarProps> = ({
                                             folders,
                                             setSelectedFolderId,
                                             isAdmin,
                                             selectedFolderId,
                                             maxFolderDepth = 2, // Domyślna wartość, jeśli nie zostanie przekazana
                                             onSearch // Nowy prop
                                         }) => {
    const [expandedFolders, setExpandedFolders] = useState<string[]>(["Bikes"]);
    const [searchTerm, setSearchTerm] = useState("");
    const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Dodajemy opóźnienie wyszukiwania, aby nie wykonywać zapytania po każdym wciśnięciu klawisza
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (onSearch) {
                onSearch(searchTerm);
            }
        }, 500); // 500ms opóźnienia

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, onSearch]);

    // Automatycznie rozwiń foldery, które zawierają zaznaczony folder
    useEffect(() => {
        if (selectedFolderId) {
            // Rozwiń wszystkie foldery nadrzędne dla zaznaczonego folderu
            const pathSegments = selectedFolderId.split('/');
            const parentPaths: string[] = [];

            // Tworzymy ścieżki wszystkich folderów nadrzędnych
            for (let i = 0; i < pathSegments.length - 1; i++) {
                const path = pathSegments.slice(0, i + 1).join('/');
                if (path) parentPaths.push(path);
            }

            // Dodajemy wszystkie ścieżki do rozszerzonych folderów
            setExpandedFolders(prev => {
                const newExpanded = [...prev];
                parentPaths.forEach(path => {
                    if (!newExpanded.includes(path)) {
                        newExpanded.push(path);
                    }
                });
                return newExpanded;
            });
        }
    }, [selectedFolderId]);

    /**
     * Rozwijanie folderu po kliknięciu w ikonę (strzałkę).
     */
    const toggleFolder = (folderPath: string, event: React.MouseEvent) => {
        event.stopPropagation(); // Zapobiega wywołaniu handleFolderClick
        setExpandedFolders((prev) =>
            prev.includes(folderPath)
                ? prev.filter((p) => p !== folderPath)
                : [...prev, folderPath]
        );
    };

    /**
     * Obsługa kliknięcia w nazwę folderu – ustawiamy wybrany folder.
     */
    const handleFolderClick = (folderPath: string) => {
        setSelectedFolderId(folderPath);
    };

    /**
     * Sprawdza, czy folder jest aktywny (bezpośrednio zaznaczony lub zawiera zaznaczony folder)
     */
    const isFolderActive = (folderPath: string): boolean => {
        if (!selectedFolderId) return false;

        // Folder jest bezpośrednio zaznaczony
        if (selectedFolderId === folderPath) return true;

        // Sprawdź, czy folder jest rodzicem zaznaczonego folderu
        if (selectedFolderId.startsWith(folderPath + '/')) return true;

        return false;
    };

    /**
     * Funkcja do tworzenia nowego folderu w głównym katalogu
     */
    const createRootFolder = () => {
        if (!newFolderName.trim()) {
            setErrorMessage("Nazwa folderu nie może być pusta");
            return;
        }

        setIsCreatingFolder(true);
        setErrorMessage(null);

        axiosInstance
            .post('/nextcloud/directory', null, {
                params: {
                    path: newFolderName
                }
            })
            .then(response => {
                setShowCreateFolderModal(false);
                setNewFolderName("");
                // Odśwież stronę, aby zobaczyć nowy folder
                window.location.reload();
            })
            .catch(error => {
                console.error("Błąd podczas tworzenia folderu:", error);
                setErrorMessage(`Błąd: ${error.response?.data || "Nie udało się utworzyć folderu"}`);
            })
            .finally(() => {
                setIsCreatingFolder(false);
            });
    };

    // Funkcja obsługująca zmianę w polu wyszukiwania
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
    };

    /**
     * Funkcja rekurencyjna do renderowania folderów i podfolderów z ograniczoną głębokością.
     * @param folder Folder do wyrenderowania
     * @param level Aktualny poziom zagnieżdżenia (0 dla folderów głównych)
     */
    const renderFolder = (folder: Folder, level: number = 0) => {
        // Wyświetlamy tylko foldery
        if (!folder.isDirectory) return null;

        // Sprawdź czy folder jest aktualnie wybrany lub aktywny (zawiera zaznaczony folder)
        const isSelected = selectedFolderId === folder.path;
        const isActive = isFolderActive(folder.path);

        // Sprawdź czy folder ma dzieci
        const hasChildren = folder.children && folder.children.length > 0;

        // Określ, czy pokazywać strzałkę rozwijania - tylko jeśli folder ma dzieci i nie przekroczył maksymalnej głębokości
        const showToggle = hasChildren && level < maxFolderDepth;

        return (
            <div key={folder.path} className="category-block" style={{ marginLeft: `${level * 10}px` }}>
                <div
                    className={`category-item ${isSelected ? 'selected' : ''} ${isActive && !isSelected ? 'active' : ''}`}
                    onClick={() => handleFolderClick(folder.path)}
                >
                    <span className="category-name">{folder.name}</span>
                    {showToggle && (
                        <span
                            className="toggle-icon"
                            onClick={(e) => toggleFolder(folder.path, e)}
                        >
                        {expandedFolders.includes(folder.path) ? "▼" : "▶"}
                    </span>
                    )}
                </div>

                {/* Renderuj dzieci tylko jeśli jesteśmy poniżej maksymalnej głębokości */}
                {expandedFolders.includes(folder.path) && hasChildren && level < maxFolderDepth && (
                    <div className="subcategory-list">
                        {folder.children?.map((child) => renderFolder(child, level + 1))}
                    </div>
                )}
            </div>
        );
    };

    /**
     * Filtrowanie folderów na podstawie wpisanego tekstu.
     */
    const filteredFolders = folders.filter((folder) =>
        folder.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="sidebar-wrapper">
            {/* Pole wyszukiwania */}
            <div className="search-container">
                <input
                    type="text"
                    placeholder="Szukaj produktów"
                    className="search-bar"
                    value={searchTerm}
                    onChange={handleSearchChange}
                />
                <span className="search-icon">🔍</span>
            </div>

            {/* Główny kontener sidebara */}
            <div className="sidebar">
                <div className="catalog-sidebar">
                    <div className="sidebar-header">
                        {isAdmin && (
                            <button
                                className="add-folder-button"
                                onClick={() => setShowCreateFolderModal(true)}
                                title="Dodaj nowy folder główny"
                            >
                                <span className="add-icon">+</span>
                            </button>
                        )}
                    </div>
                    <div className="sidebar-categories">
                        {filteredFolders.map((folder) => renderFolder(folder))}
                    </div>
                </div>
            </div>

            {/* Modal do tworzenia nowego folderu głównego */}
            {showCreateFolderModal && (
                <div className="modal-overlay">
                    <div className="sidebar-modal">
                        <h3>Nowy folder główny</h3>
                        <input
                            type="text"
                            placeholder="Nazwa folderu"
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            className="folder-name-input"
                            disabled={isCreatingFolder}
                        />
                        {errorMessage && (
                            <div className="error-message">{errorMessage}</div>
                        )}
                        <div className="modal-buttons">
                            <button
                                onClick={createRootFolder}
                                disabled={isCreatingFolder || !newFolderName.trim()}
                                className="create-button"
                            >
                                {isCreatingFolder ? "Tworzenie..." : "Utwórz"}
                            </button>
                            <button
                                onClick={() => {
                                    setShowCreateFolderModal(false);
                                    setNewFolderName("");
                                    setErrorMessage(null);
                                }}
                                className="cancel-button"
                                disabled={isCreatingFolder}
                            >
                                Anuluj
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Sidebar;