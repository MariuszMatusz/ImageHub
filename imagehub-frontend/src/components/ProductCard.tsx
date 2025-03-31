import React, { useState, useEffect } from 'react';
import '../styles/ProductCard.css';
import axiosInstance from "../utils/axiosInstance";
import { usePermissions } from '../contexts/PermissionContext';

interface ProductCardProps {
    folderPath: string;
    onClose: () => void;
}

interface ProductInfo {
    name?: string;
    sku?: string;
    path?: string;
    availableFiles?: Record<string, string>;
    imageTypes?: string[];
}

interface FolderInfo {
    name: string;
    path: string;
    lastModified?: string;
}

interface SelectedFiles {
    all: boolean;
    [key: string]: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({ folderPath, onClose }) => {
    const [productInfo, setProductInfo] = useState<ProductInfo | null>(null);
    const [folderInfo, setFolderInfo] = useState<FolderInfo | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedFiles, setSelectedFiles] = useState<SelectedFiles>({
        all: false
    });
    const [usingFallback, setUsingFallback] = useState<boolean>(false);

    // Użyj kontekstu uprawnień
    const { hasPermission, canReadFolder } = usePermissions();

    // Funkcja do pobierania podstawowych informacji o folderze jako fallback
    const fetchFolderInfoFallback = async () => {
        try {
            console.log(`Pobieranie podstawowych informacji o folderze: ${folderPath}`);

            // Pobierz informacje o folderze - endpoint dostępny dla wszystkich użytkowników z dostępem do folderu
            const response = await axiosInstance.get(`/nextcloud/files`, {
                params: {
                    path: folderPath,
                    includeChildren: false,
                    depth: 0
                }
            });

            // Znajdź bieżący folder w odpowiedzi
            const currentFolder = response.data.find((item: any) => item.path === folderPath) || {
                name: folderPath.split('/').pop(),
                path: folderPath
            };

            setFolderInfo(currentFolder);
            setUsingFallback(true);
            console.log("Używam podstawowych informacji o folderze jako fallback", currentFolder);

            // Ustaw domyślne typy plików
            setSelectedFiles({
                all: false,
                Detail_JPG: false,
                Detail_PNG: false,
                '360_PNG': false,
                FULL_JPG: false,
                FULL_PNG: false
            });

            return true;
        } catch (err) {
            console.error("Błąd podczas pobierania fallbacku dla folderu:", err);
            return false;
        }
    };

    useEffect(() => {
        const fetchProductInfo = async () => {
            try {
                console.log(`Pobieranie informacji o produkcie ze ścieżki: ${folderPath}`);

                const response = await axiosInstance.get('/nextcloud/product-info', {
                    params: { path: folderPath }
                });

                setProductInfo(response.data);
                setUsingFallback(false);

                // Dynamiczne tworzenie stanu dla dostępnych plików
                if (response.data.imageTypes && response.data.imageTypes.length > 0) {
                    const initialFileState: SelectedFiles = { all: false };
                    response.data.imageTypes.forEach((fileType: string) => {
                        initialFileState[fileType] = false;
                    });
                    setSelectedFiles(initialFileState);
                } else {
                    // Domyślne typy plików jeśli backend nie zwrócił listy
                    setSelectedFiles({
                        all: false,
                        Detail_JPG: false,
                        Detail_PNG: false,
                        '360_PNG': false,
                        FULL_JPG: false,
                        FULL_PNG: false
                    });
                }
            } catch (err: any) {
                console.error("Error fetching product info:", err);

                // Próbuj użyć fallbacku
                const fallbackSuccess = await fetchFolderInfoFallback();

                if (!fallbackSuccess) {
                    // Bardziej szczegółowa obsługa błędów, jeśli fallback też się nie powiódł
                    if (err.response) {
                        if (err.response.status === 404) {
                            setError(`Nie można znaleźć informacji o produkcie. Ścieżka: ${folderPath}`);
                        } else if (err.response.status === 403) {
                            setError("Brak uprawnień do wyświetlenia produktu");
                        } else {
                            setError(`Błąd podczas pobierania informacji o produkcie: ${err.response.status}`);
                        }
                    } else if (err.request) {
                        setError("Brak odpowiedzi z serwera, sprawdź połączenie");
                    } else {
                        setError(`Nie udało się pobrać informacji o produkcie: ${err.message}`);
                    }
                }
            } finally {
                setLoading(false);
            }
        };

        fetchProductInfo();
    }, [folderPath]);

    const handleDownload = (fileType: string) => {
        // Dla pobierania plików nadal sprawdzamy uprawnienia
        if (!canReadFolder(folderPath)) {
            setError("Brak uprawnień do pobrania plików");
            return;
        }

        // Konstruuj URL pobierania
        const downloadPath = `${folderPath}/${fileType}`;
        console.log(`Downloading file: ${downloadPath}`);

        // Otwórz pobieranie w nowym oknie/zakładce
        window.open(`/nextcloud/files/download?file=${downloadPath}`, '_blank');
    };

    const toggleSelectAll = (checked: boolean) => {
        const newSelected: SelectedFiles = { ...selectedFiles };
        Object.keys(selectedFiles).forEach(key => {
            newSelected[key] = checked;
        });
        setSelectedFiles(newSelected);
    };

    const handleCheckboxChange = (key: string, checked: boolean) => {
        setSelectedFiles({
            ...selectedFiles,
            [key]: checked
        });
    };

    const downloadSelected = () => {
        // Dla pobierania plików nadal sprawdzamy uprawnienia
        if (!canReadFolder(folderPath)) {
            setError("Brak uprawnień do pobrania plików");
            return;
        }

        // Pobierz wybrane pliki
        Object.keys(selectedFiles).forEach(key => {
            if (key !== 'all' && selectedFiles[key]) {
                handleDownload(key);
            }
        });
    };

    // Sprawdź, czy użytkownik może pobierać pliki
    const canDownloadFiles = canReadFolder(folderPath);

    // Pobierz nazwę produktu/folderu
    const getProductName = () => {
        if (productInfo && productInfo.name) {
            return productInfo.name;
        } else if (folderInfo && folderInfo.name) {
            return folderInfo.name;
        } else {
            // Ostateczny fallback - pobierz nazwę z ścieżki
            return folderPath.split('/').pop() || "Nieznany produkt";
        }
    };

    // Pobierz SKU produktu
    const getProductSku = () => {
        if (productInfo && productInfo.sku) {
            return productInfo.sku;
        } else if (folderInfo) {
            // Fallback - użyj nazwy folderu jako SKU
            return folderInfo.name;
        } else {
            return "Brak SKU";
        }
    };

    return (
        <div className="product-card-overlay" onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
        }}>
            <div className="product-card-PR">
                <button className="close-button" onClick={onClose}>×</button>

                {loading ? (
                    <div className="loading">Ładowanie informacji o produkcie...</div>
                ) : error ? (
                    <div className="error">
                        <h3>Nie można wyświetlić produktu</h3>
                        <p>{error}</p>
                        <div className="product-info-debug">
                            <p>Folder: {folderPath}</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {usingFallback && (
                            <div className="info-banner">
                                Wyświetlam podstawowe informacje o produkcie (tryb ograniczony)
                            </div>
                        )}

                        <div className="product-image">
                            <img src="/placeholder-image.png" alt={getProductName()} />
                            <div className="image-navigation">
                                <button className="prev-button">←</button>
                                <button className="next-button">→</button>
                            </div>
                        </div>

                        <div className="product-info">
                            <h2>Informacje o produkcie</h2>

                            <div className="product-details">
                                <div className="detail-row">
                                    <span className="detail-label">Nazwa produktu</span>
                                    <span className="detail-value">{getProductName()}</span>
                                </div>

                                <div className="detail-row">
                                    <span className="detail-label">SKU</span>
                                    <span className="detail-value">{getProductSku()}</span>
                                </div>

                                <div className="detail-row">
                                    <span className="detail-label">Ścieżka</span>
                                    <span className="detail-value">{folderPath}</span>
                                </div>

                                {folderInfo && folderInfo.lastModified && (
                                    <div className="detail-row">
                                        <span className="detail-label">Ostatnia modyfikacja</span>
                                        <span className="detail-value">
                                            {new Date(folderInfo.lastModified).toLocaleString()}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="download-section">
                                {canDownloadFiles ? (
                                    <div className="download-dropdown">
                                        <button className="download-button">Pobierz</button>
                                        <div className="download-options">
                                            <label>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedFiles.all}
                                                    onChange={(e) => toggleSelectAll(e.target.checked)}
                                                /> Pobierz wszystko
                                            </label>
                                            {Object.keys(selectedFiles).map(key => {
                                                if (key === 'all') return null;
                                                return (
                                                    <label key={key}>
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedFiles[key]}
                                                            onChange={(e) => handleCheckboxChange(key, e.target.checked)}
                                                        /> {key}
                                                    </label>
                                                );
                                            })}
                                            <button
                                                className="download-selected"
                                                onClick={downloadSelected}
                                                disabled={!Object.keys(selectedFiles).some(k => k !== 'all' && selectedFiles[k])}
                                            >
                                                POBIERZ
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="no-download-permission">
                                        <p>Brak uprawnień do pobierania plików produktu</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default ProductCard;