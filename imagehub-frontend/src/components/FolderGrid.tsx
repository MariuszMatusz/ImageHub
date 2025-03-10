import React, { useState, useEffect } from "react";
import axiosInstance from "../utils/axiosInstance";
import "../styles/FolderGrid.css";

// Interfejs odpowiadający strukturze zwracanej przez API Nextcloud
interface Folder {
    name: string;
    path: string;
    isDirectory: boolean;
    contentType?: string;
    contentLength?: number;
    lastModified?: string;
    canWrite?: boolean;
    canDelete?: boolean;
}

interface FolderGridProps {
    parentFolderId: string | null;
    userRole: string;
}

const FolderGrid: React.FC<FolderGridProps> = ({ parentFolderId, userRole }) => {
    const [items, setItems] = useState<Folder[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");
    const [fileToUpload, setFileToUpload] = useState<File | null>(null);
    const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [sortOrder, setSortOrder] = useState<string>("newest");
    const [currentSeason, setCurrentSeason] = useState<string>("2025");

    useEffect(() => {
        if (parentFolderId === null) return;

        setLoading(true);
        setError(null);

        // Ustal ścieżkę – gdy parentFolderId jest null pobieramy foldery główne (root)
        const path = parentFolderId !== null ? parentFolderId : "";

        axiosInstance
            .get(`/nextcloud/files`, {
                params: {
                    path: path,
                    includeChildren: false,
                    depth: 1,
                }
            })
            .then(response => {
                setItems(response.data);
                setLoading(false);
            })
            .catch(error => {
                console.error("Error fetching items:", error);
                setError("Nie udało się załadować zawartości folderu.");
                setLoading(false);
            });
    }, [parentFolderId]);

    // Funkcja do tworzenia nowego folderu
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
                // Dodaj nowy folder do listy
                const newFolder: Folder = {
                    name: newFolderName,
                    path: path,
                    isDirectory: true,
                    canWrite: true,
                    canDelete: true
                };
                setItems([...items, newFolder]);
                setActionMessage({ type: 'success', text: 'Folder utworzony pomyślnie' });
                setShowCreateFolderModal(false);
                setNewFolderName("");
            })
            .catch(error => {
                console.error("Error creating folder:", error);
                setActionMessage({ type: 'error', text: `Błąd podczas tworzenia folderu: ${error.response?.data || 'Nieznany błąd'}` });
            });
    };

    // Funkcja do przesyłania pliku
    const uploadFile = () => {
        if (!fileToUpload) {
            setActionMessage({ type: 'error', text: 'Wybierz plik do przesłania' });
            return;
        }

        const formData = new FormData();
        formData.append('file', fileToUpload);
        formData.append('path', parentFolderId || '');

        axiosInstance
            .post('/nextcloud/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            })
            .then(() => {
                // Dodaj przesłany plik do listy
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
                setItems([...items, newFile]);
                setActionMessage({ type: 'success', text: 'Plik przesłany pomyślnie' });
                setShowUploadModal(false);
                setFileToUpload(null);
            })
            .catch(error => {
                console.error("Error uploading file:", error);
                setActionMessage({ type: 'error', text: `Błąd podczas przesyłania pliku: ${error.response?.data || 'Nieznany błąd'}` });
            });
    };

    // Funkcja do usuwania pliku lub folderu
    const deleteItem = (item: Folder) => {
        if (!window.confirm(`Czy na pewno chcesz usunąć ${item.isDirectory ? 'folder' : 'plik'} ${item.name}?`)) {
            return;
        }

        axiosInstance
            .delete(`/nextcloud/files/${item.path}`)
            .then(() => {
                // Usuń element z listy
                setItems(items.filter(i => i.path !== item.path));
                setActionMessage({ type: 'success', text: `${item.isDirectory ? 'Folder' : 'Plik'} usunięty pomyślnie` });
            })
            .catch(error => {
                console.error("Error deleting item:", error);
                setActionMessage({ type: 'error', text: `Błąd podczas usuwania: ${error.response?.data || 'Nieznany błąd'}` });
            });
    };

    // Funkcja do pobierania pliku
    const downloadFile = (item: Folder) => {
        axiosInstance
            .get(`/nextcloud/files/${item.path}`, {
                responseType: 'blob'
            })
            .then(response => {
                // Utwórz link do pobrania pliku
                const url = window.URL.createObjectURL(new Blob([response.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', item.name);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            })
            .catch(error => {
                console.error("Error downloading file:", error);
                setActionMessage({ type: 'error', text: "Błąd podczas pobierania pliku" });
            });
    };

    // Renderuj komponent
    return (
        <div className="product-grid-container">
            {/* Pasek filtrów */}
            <div className="filter-controls">
                <div className="sort-dropdown">
                    <span>Sortuj: </span>
                    <button
                        className={`sort-btn ${sortOrder === "newest" ? "active" : ""}`}
                        onClick={() => setSortOrder("newest")}
                    >
                        Najnowszych
                    </button>
                </div>
                <div className="season-filter">
                    <button
                        className={`season-btn ${currentSeason === "2025" ? "active" : ""}`}
                        onClick={() => setCurrentSeason("2025")}
                    >
                        Sezon: 2025
                    </button>
                </div>

                {/* Przyciski akcji dla administratora */}
                {userRole === 'ADMIN' && (
                    <div className="admin-actions">
                        <button
                            className="admin-btn"
                            onClick={() => setShowCreateFolderModal(true)}
                        >
                            Nowy folder
                        </button>
                        <button
                            className="admin-btn"
                            onClick={() => setShowUploadModal(true)}
                        >
                            Dodaj plik
                        </button>
                    </div>
                )}
            </div>

            {/* Komunikat o akcji */}
            {actionMessage && (
                <div className={`action-message ${actionMessage.type}`}>
                    {actionMessage.text}
                    <button onClick={() => setActionMessage(null)}>×</button>
                </div>
            )}

            {/* Ładowanie */}
            {loading && <div className="loading">Ładowanie zawartości...</div>}

            {/* Błąd */}
            {error && <div className="error">{error}</div>}

            {/* Brak folderu */}
            {!parentFolderId && !loading && !error && (
                <div className="no-folder-selected">
                    <p>Wybierz folder z panelu po lewej stronie</p>
                </div>
            )}

            {/* Siatka plików i folderów w stylu produktów */}
            {parentFolderId && !loading && !error && (
                <div className="product-grid">
                    {items.length === 0 ? (
                        <div className="empty-folder">
                            <p>Ten folder jest pusty</p>
                        </div>
                    ) : (
                        items.map((item) => (
                            <div key={item.path} className="product-card">
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
                                            <p>Folder</p>
                                        ) : (
                                            <p>Plik</p>
                                        )}
                                    </div>
                                    <div className="product-actions">
                                        {item.isDirectory ? (
                                            <button
                                                className="btn-open"
                                                onClick={() => window.location.href = `/dashboard?folder=${item.path}`}
                                            >
                                                Otwórz
                                            </button>
                                        ) : (
                                            <button
                                                className="btn-download"
                                                onClick={() => downloadFile(item)}
                                            >
                                                Pobierz
                                            </button>
                                        )}
                                        {(userRole === 'ADMIN' || item.canDelete) && (
                                            <button
                                                className="btn-delete"
                                                onClick={() => deleteItem(item)}
                                            >
                                                Usuń
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Modal do tworzenia folderu */}
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

            {/* Modal do przesyłania plików */}
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