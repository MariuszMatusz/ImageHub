import React, { useState, useEffect } from 'react';
import '../styles/ProductFolderManagement.css';
import axiosInstance from "../utils/axiosInstance";

interface Folder {
    name: string;
    path: string;
    fullPath: string;
    isDirectory?: boolean;
    children?: Folder[];
}

const ProductFolderManagement: React.FC = () => {
    const [folders, setFolders] = useState<Folder[]>([]);
    const [productFolders, setProductFolders] = useState<string[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [selectedFolder, setSelectedFolder] = useState<string>('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);

            // Pobierz wszystkie foldery
            const foldersResponse = await axiosInstance.get('/nextcloud/files', {
                params: { includeChildren: true, depth: 3 }
            });

            // Pobierz foldery produktowe
            const productFoldersResponse = await axiosInstance.get('/folder-permissions/product-folders');

            const flattenFolders = (items: any[], parentPath = ''): Folder[] => {
                let result: Folder[] = [];
                items.forEach(item => {
                    if (item.isDirectory) {
                        const fullPath = parentPath ? `${parentPath} / ${item.name}` : item.name;
                        result.push({
                            name: item.name,
                            path: item.path,
                            fullPath
                        });

                        if (item.children && item.children.length > 0) {
                            result = [...result, ...flattenFolders(item.children, fullPath)];
                        }
                    }
                });
                return result;
            };

            setFolders(flattenFolders(foldersResponse.data));
            setProductFolders(productFoldersResponse.data);

        } catch (err) {
            console.error("Error fetching data:", err);
            setError("Nie udało się pobrać danych");
        } finally {
            setLoading(false);
        }
    };

    // Zmodyfikowana funkcja, aby przyjmowała opcjonalny parametr folderPath
    const handleSetProductFolder = async (folderPath?: string) => {
        // Użyj dostarczonego folderPath lub w przeciwnym razie selectedFolder
        const pathToUse = folderPath || selectedFolder;

        if (!pathToUse) {
            setError("Proszę wybrać folder");
            return;
        }

        try {
            setLoading(true);

            // Sprawdź, czy folder jest już oznaczony jako mający dzieci-produkty
            const isAlreadyProductParent = productFolders.includes(pathToUse);

            // Wyślij żądanie do API
            await axiosInstance.post('/folder-permissions/product-children-folder', null, {
                params: {
                    folderPath: pathToUse,
                    hasChildrenAsProducts: !isAlreadyProductParent
                }
            });

            // Zaktualizuj lokalną listę
            if (isAlreadyProductParent) {
                setProductFolders(productFolders.filter(path => path !== pathToUse));
                setSuccess(`Folder "${pathToUse}" został oznaczony jako zwykły folder (dzieci nie są produktami)`);
            } else {
                setProductFolders([...productFolders, pathToUse]);
                setSuccess(`Folder "${pathToUse}" został oznaczony jako folder z podfolderami-produktami`);
            }

        } catch (err) {
            console.error("Error setting product folder:", err);
            setError("Nie udało się zaktualizować statusu folderu");
        } finally {
            setLoading(false);
        }
    };

    // funkcja do formatowania ścieżki z wyróżnieniem hierarchii
    const formatFolderPath = (path: string) => {
        const segments = path.split('/');
        return segments.map((segment, index) => (
            <span key={index}>
            {index > 0 && <span className="path-separator"> / </span>}
                {segment}
        </span>
        ));
    };

    return (
        <div className="product-folder-management">
            <h2>Zarządzanie folderami produktowymi</h2>

            {error && (
                <div className="status-message error">
                    {error}
                    <button className="close-btn" onClick={() => setError(null)}>×</button>
                </div>
            )}

            {success && (
                <div className="status-message success">
                    {success}
                    <button className="close-btn" onClick={() => setSuccess(null)}>×</button>
                </div>
            )}

            <div className="form-group">
                <label htmlFor="folder-select">Wybierz folder:</label>
                <select
                    id="folder-select"
                    value={selectedFolder}
                    onChange={(e) => setSelectedFolder(e.target.value)}
                    disabled={loading}
                >
                    <option value="">-- Wybierz folder --</option>
                    {folders.map((folder) => (
                        <option key={folder.path} value={folder.path}>
                            {folder.fullPath}
                        </option>
                    ))}
                </select>
            </div>

            <button
                className="toggle-product-btn"
                onClick={() => handleSetProductFolder()}
                disabled={loading || !selectedFolder}
            >
                {selectedFolder && productFolders.includes(selectedFolder)
                    ? "Wyłącz tryb produktów dla podfolderów"
                    : "Włącz tryb produktów dla podfolderów"}
            </button>

            <div className="product-folders-list">
                <h3>Aktualne foldery produktowe:</h3>
                {loading ? (
                    <div className="loading-message">Ładowanie...</div>
                ) : productFolders.length === 0 ? (
                    <p>Brak folderów oznaczonych jako produkty</p>
                ) : (
                    <ul>
                        {productFolders.map((path) => (
                            <li key={path} className="product-folder-item">
                                <div className="folder-path">{formatFolderPath(path)}</div>
                                <button
                                    className="remove-btn"
                                    onClick={() => {
                                        handleSetProductFolder(path);
                                    }}
                                >
                                    ×
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default ProductFolderManagement;