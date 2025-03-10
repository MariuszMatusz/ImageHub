import React, { useState } from "react";
import "../styles/Sidebar.css";

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
}

const Sidebar: React.FC<SidebarProps> = ({ folders, setSelectedFolderId, isAdmin, selectedFolderId }) => {
    const [expandedFolders, setExpandedFolders] = useState<string[]>(["Bikes"]);
    const [searchTerm, setSearchTerm] = useState("");

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
     * Funkcja rekurencyjna do renderowania folderów i podfolderów.
     */
    const renderFolder = (folder: Folder) => {
        // Wyświetlamy tylko foldery
        if (!folder.isDirectory) return null;

        // Sprawdź czy folder jest aktualnie wybrany
        const isSelected = selectedFolderId === folder.path;

        // Sprawdź czy folder ma dzieci
        const hasChildren = folder.children && folder.children.length > 0;

        return (
            <div key={folder.path} className="category-block">
                <div
                    className={`category-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleFolderClick(folder.path)}
                >
                    <span className="category-name">{folder.name}</span>
                    {hasChildren && (
                        <span
                            className="toggle-icon"
                            onClick={(e) => toggleFolder(folder.path, e)}
                        >
                            {expandedFolders.includes(folder.path) ? "▼" : "▶"}
                        </span>
                    )}
                </div>

                {expandedFolders.includes(folder.path) && hasChildren && (
                    <div className="subcategory-list">
                        {folder.children?.map((child) =>
                            child.isDirectory ? (
                                <div
                                    key={child.path}
                                    className={`subcategory-item ${selectedFolderId === child.path ? 'selected' : ''}`}
                                    onClick={() => handleFolderClick(child.path)}
                                >
                                    {child.name}
                                </div>
                            ) : null
                        )}
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
            {/* Pole wyszukiwania poza głównym kontenerem */}
            <div className="search-container">
                <input
                    type="text"
                    placeholder="Search products"
                    className="search-bar"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Główny kontener sidebara */}
            <div className="sidebar">
                <div className="catalog-sidebar">
                    <div className="sidebar-categories">
                        {filteredFolders.map((folder) => renderFolder(folder))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;