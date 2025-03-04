import React, { useState } from "react";
import "../styles/Sidebar.css";

interface Folder {
    id: number;
    name: string;
    subfolders?: Folder[];
}

interface SidebarProps {
    folders: Folder[];
    setSelectedFolderId: (id: number | null) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ folders, setSelectedFolderId }) => {
    const [expandedFolders, setExpandedFolders] = useState<number[]>([]);
    const [searchTerm, setSearchTerm] = useState("");

    /**
     * Rozwijanie folderu po kliknięciu w ikonę (strzałkę).
     */
    const toggleFolder = (
        folderId: number,
        event: React.MouseEvent
    ) => {
        event.stopPropagation(); // Aby kliknięcie nie wywoływało handleFolderClick
        setExpandedFolders((prev) =>
            prev.includes(folderId)
                ? prev.filter((id) => id !== folderId)
                : [...prev, folderId]
        );
    };

    /**
     * Obsługa kliknięcia w nazwę folderu – np. ustawiamy wybrany folder.
     */
    const handleFolderClick = (folderId: number) => {
        setSelectedFolderId(folderId);
    };

    /**
     * Filtrowanie folderów po wpisanym tekście w polu wyszukiwania.
     */
    const filteredFolders = folders.filter((folder) =>
        folder.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <>
            <div className="sidebar">
            <div className="sidebar-searchFolder">
            {/* Pole wyszukiwania poza kontenerem */}
            <input
                type="text"
                placeholder="Search folders"
                className="search-bar"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            /> </div>

            <div className="sidebar-container">
                {/* Lista folderów (z subfolderami) */}
                <div className="folder-list">
                    {filteredFolders.map((folder) => (
                        <div key={folder.id} className="folder-block">
                            <div
                                className="folder-item"
                                onClick={() => handleFolderClick(folder.id)}
                            >
                                <span>{folder.name}</span>
                                {/* Ikona rozwijania, jeśli folder ma subfoldery */}
                                {folder.subfolders && folder.subfolders.length > 0 && (
                                    <span
                                        className="toggle-icon"
                                        onClick={(e) => toggleFolder(folder.id, e)}
                                    >
                  {expandedFolders.includes(folder.id) ? "▲" : "▼"}
                </span>
                                )}
                            </div>

                            {/* Lista subfolderów, jeśli folder jest rozwinięty */}
                            {expandedFolders.includes(folder.id) && folder.subfolders && (
                                <div className="subfolder-list">
                                    {folder.subfolders.map((sub) => (
                                        <div
                                            key={sub.id}
                                            className="subfolder-item"
                                            onClick={() => handleFolderClick(sub.id)}
                                        >
                                            {sub.name}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
            </div>
        </>
    );
};

export default Sidebar;
