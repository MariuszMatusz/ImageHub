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
    isDirectory?: boolean;
    children?: FolderInfo[];
}

interface FileInfo {
    name: string;
    path: string;
    isDirectory: boolean;
    contentType?: string;
    contentLength?: number;
    lastModified?: string;
}

interface SelectedFiles {
    all: boolean;
    [key: string]: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({ folderPath, onClose }) => {
    const [productInfo, setProductInfo] = useState<ProductInfo | null>(null);
    const [folderInfo, setFolderInfo] = useState<FolderInfo | null>(null);
    const [folderContents, setFolderContents] = useState<FileInfo[]>([]);
    const [subFolders, setSubFolders] = useState<FolderInfo[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedFiles, setSelectedFiles] = useState<SelectedFiles>({
        all: false
    });
    const [usingFallback, setUsingFallback] = useState<boolean>(false);
    const [currentImage, setCurrentImage] = useState<string | null>(null);
    const [currentSubFolder, setCurrentSubFolder] = useState<string | null>(null);
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [selectionMode, setSelectionMode] = useState<boolean>(false);
    const [allProductImages, setAllProductImages] = useState<FileInfo[]>([]);
    const [currentImageBlobUrl, setCurrentImageBlobUrl] = useState<string | null>(null);
    const [imageLoading, setImageLoading] = useState<boolean>(false);

    // Użyj kontekstu uprawnień
    const { hasPermission, canReadFolder, canDownloadFolder } = usePermissions();

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

    // Funkcja do pobierania zawartości folderu
    const fetchFolderContents = async (path: string) => {
        try {
            console.log(`Pobieranie zawartości folderu: ${path}`);

            const response = await axiosInstance.get(`/nextcloud/files`, {
                params: {
                    path: path,
                    includeChildren: true,
                    depth: 1
                }
            });

            // Filtrujemy, aby nie zawierać samego folderu w wynikach
            // ani folderu produktu (gdy jesteśmy w podfolderze)
            const contents = response.data.filter((item: any) => {
                // Usuń bieżący folder - dwa warunki sprawdzające
                if (item.path === path) return false;

                // Usuń folder, który ma taką samą nazwę jak bieżący folder
                const currentFolderName = path.split('/').pop() || '';
                if (item.name === currentFolderName && item.isDirectory) return false;

                // Jeśli jesteśmy w podfolderze, usuń folder produktu i jego elementy
                if (path !== folderPath) {
                    // Usuń folder produktu
                    if (item.path === folderPath) return false;

                    // Usuń folder, który ma taką samą nazwę jak folder produktu
                    const folderName = folderPath.split('/').pop() || '';
                    if (item.name === folderName && item.isDirectory && item.path.includes(folderPath)) return false;
                }

                return true;
            });

            // Rozdzielamy na podfoldery i pliki
            const folders = contents.filter((item: any) => item.isDirectory);
            const files = contents.filter((item: any) => !item.isDirectory);

            return { folders, files, allContents: contents };
        } catch (err) {
            console.error(`Błąd podczas pobierania zawartości folderu ${path}:`, err);
            throw err;
        }
    };

    // Funkcja do rekurencyjnego pobierania obrazów z podfolderów
    const fetchAllProductImages = async (rootPath: string) => {
        try {
            console.log(`Pobieranie wszystkich obrazów produktu z: ${rootPath}`);
            const allImages: FileInfo[] = [];

            // Pobierz zawartość głównego folderu
            const response = await axiosInstance.get(`/nextcloud/files`, {
                params: {
                    path: rootPath,
                    includeChildren: true,
                    depth: 1
                }
            });

            // Filtruj obrazy z głównego folderu
            const mainFolderImages = response.data
                .filter((item: any) =>
                    !item.isDirectory &&
                    (item.contentType?.includes('image') ||
                        item.name.match(/\.(jpg|jpeg|png|gif)$/i))
                );

            allImages.push(...mainFolderImages);

            // Pobierz podfoldery
            const subfolders = response.data.filter((item: any) =>
                item.isDirectory && item.path !== rootPath
            );

            // Rekurencyjnie pobierz obrazy z podfolderów
            for (const subfolder of subfolders) {
                try {
                    const subfolderResponse = await axiosInstance.get(`/nextcloud/files`, {
                        params: {
                            path: subfolder.path,
                            includeChildren: true,
                            depth: 1
                        }
                    });

                    const subfolderImages = subfolderResponse.data
                        .filter((item: any) =>
                            !item.isDirectory &&
                            (item.contentType?.includes('image') ||
                                item.name.match(/\.(jpg|jpeg|png|gif)$/i))
                        );

                    allImages.push(...subfolderImages);
                } catch (err) {
                    console.error(`Błąd podczas pobierania obrazów z podfolderu ${subfolder.path}:`, err);
                    // Kontynuuj mimo błędu dla jednego podfolderu
                }
            }

            return allImages;
        } catch (err) {
            console.error(`Błąd podczas pobierania wszystkich obrazów produktu z ${rootPath}:`, err);
            return [];
        }
    };


    // Pobieranie wszystkich plików z bieżącego folderu
    const downloadAllFiles = async () => {
        // Sprawdź uprawnienia
        if (!canDownloadFolder(folderPath)) {
            setError("Brak uprawnień do pobrania plików");
            return;
        }

        try {
            const currentPath = currentSubFolder || folderPath;

            // Pobierz folder jako ZIP używając Axios
            const response = await axiosInstance.get(`/nextcloud/files/download-zip`, {
                params: {
                    file: currentPath
                },
                responseType: 'blob'
            });

            // Utwórz link do pobrania
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;

            // Nazwa pliku ZIP
            const folderName = currentPath.split('/').pop() || 'folder';
            link.setAttribute('download', `${folderName}.zip`);

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } catch (err) {
            console.error("Błąd podczas pobierania wszystkich plików:", err);
            setError("Błąd podczas pobierania wszystkich plików");
        }
    };

    // Funkcja do wyświetlania podglądu obrazu
    const handleImagePreview = (filePath: string) => {
        setCurrentImage(filePath);
    };

    // Funkcja do nawigacji po podfolderach
    const handleSubFolderClick = async (folderPath: string) => {
        setCurrentSubFolder(folderPath);
        setLoading(true);

        try {
            const { folders, files, allContents } = await fetchFolderContents(folderPath);
            setSubFolders(folders);
            setFolderContents(files);

            // Inicjalizacja zaznaczenia plików
            const initialFileStates: SelectedFiles = { all: false };
            files.forEach((file: FileInfo) => {
                initialFileStates[file.path] = false;
            });
            setSelectedFiles(initialFileStates);

            setLoading(false);
        } catch (err) {
            setError(`Nie udało się załadować zawartości podfolderu: ${folderPath}`);
            setLoading(false);
        }
    };

    // Powrót do głównego folderu produktu
    const handleBackToMainFolder = () => {
        setCurrentSubFolder(null);
        loadProductData();
    };

    // Funkcja ładująca dane produktu
    const loadProductData = async () => {
        try {
            setLoading(true);
            console.log(`Pobieranie informacji o produkcie ze ścieżki: ${folderPath}`);

            // Najpierw próbuj pobrać informacje o produkcie
            try {
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
                // } else {
                //     // Domyślne typy plików jeśli backend nie zwrócił listy
                //     setSelectedFiles({
                //         all: false,
                //         FULL_JPG: false,
                //         FULL_PNG: false
                //     });
                }
            } catch (err) {
                console.error("Error fetching product info:", err);

                // Próbuj użyć fallbacku
                await fetchFolderInfoFallback();
            }

            // Pobierz zawartość folderu
            const { folders, files, allContents } = await fetchFolderContents(folderPath);
            setSubFolders(folders);
            setFolderContents(files);

            // Pobierz wszystkie obrazy z podfolderów
            const allImages = await fetchAllProductImages(folderPath);
            setAllProductImages(allImages);

            // Jeśli są obrazy w głównym folderze, ustaw pierwszy jako bieżący do podglądu
            if (files.length > 0) {
                const imageFiles = files.filter((file: FileInfo) =>
                    file.contentType?.includes('image') ||
                    file.name.match(/\.(jpg|jpeg|png|gif)$/i)
                );

                if (imageFiles.length > 0) {
                    setCurrentImage(imageFiles[0].path);
                } else if (allImages.length > 0) {
                    // Jeśli nie ma obrazów w głównym folderze, ale są w podfolderach
                    setCurrentImage(allImages[0].path);
                }
            } else if (allImages.length > 0) {
                // Jeśli nie ma plików w głównym folderze, ale są obrazy w podfolderach
                setCurrentImage(allImages[0].path);
            }

            setLoading(false);
        } catch (err: any) {
            console.error("Error loading product data:", err);
            setLoading(false);

            // Bardziej szczegółowa obsługa błędów
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
    };

    useEffect(() => {
        loadProductData();
    }, [folderPath]);

    useEffect(() => {
        // Wyczyść poprzedni blob URL, jeśli istnieje
        if (currentImageBlobUrl) {
            URL.revokeObjectURL(currentImageBlobUrl);
            setCurrentImageBlobUrl(null);
        }

        if (currentImage) {
            fetchImageAsDataUrl(currentImage).then(url => {
                if (url) {
                    setCurrentImageBlobUrl(url);
                }
            });
        }
        // Cleanup przy odmontowaniu komponentu
        return () => {
            if (currentImageBlobUrl) {
                URL.revokeObjectURL(currentImageBlobUrl);
            }
        };
    }, [currentImage]); // Uruchamiaj tylko gdy zmieni się currentImage

    // Dodaj funkcję do pobierania obrazu jako blob i konwersji na URL danych
    const fetchImageAsDataUrl = async (imagePath: string) => {
        if (!imagePath) return null;

        setImageLoading(true);

        try {
            // Używaj axiosInstance, które już zawiera nagłówki autoryzacji
            const response = await axiosInstance.get(`/nextcloud/files/download`, {
                params: {
                    file: imagePath
                },
                responseType: 'blob'
            });

            // Konwertuj blob na obiekt URL
            const blobUrl = URL.createObjectURL(response.data);
            setImageLoading(false);
            return blobUrl;
        } catch (error) {
            console.error("Błąd podczas pobierania obrazu:", error, imagePath);
            setImageLoading(false);
            return null;
        }
    };

    const handleDownload = (fileType: string) => {
        // Dla pobierania plików nadal sprawdzamy uprawnienia
        if (!canDownloadFolder(folderPath)) {
            setError("Brak uprawnień do pobrania plików");
            return;
        }

        // Konstruuj URL pobierania
        const downloadPath = `${folderPath}/${fileType}`;
        console.log(`Downloading file: ${downloadPath}`);

        // Otwórz pobieranie w nowym oknie/zakładce
        window.open(`/nextcloud/files/download?file=${downloadPath}`, '_blank');
    };

    // Funkcja pobierania pojedynczego pliku
    const downloadFile = async (filePath: string) => {
        if (!canDownloadFolder(filePath)) {
            setError("Brak uprawnień do pobrania pliku");
            return;
        }

        try {
            console.log(`Downloading file: ${filePath}`);

            // Sprawdź, czy to folder - jeśli tak, użyj endpoint download-zip
            const isDirectory = filePath.endsWith('/') || subFolders.some(folder => folder.path === filePath);

            if (isDirectory) {
                // Pobierz folder jako ZIP
                const response = await axiosInstance.get(`/nextcloud/files/download-zip`, {
                    params: {
                        file: filePath
                    },
                    responseType: 'blob'
                });

                // Utwórz URL dla pobranego pliku
                const url = window.URL.createObjectURL(new Blob([response.data]));

                // Utwórz element 'a' do pobrania
                const link = document.createElement('a');
                link.href = url;

                // Ustaw nazwę folderu
                const folderName = filePath.split('/').pop() || 'folder';
                link.setAttribute('download', `${folderName}.zip`);

                // Dodaj, kliknij i usuń
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                // Zwolnij URL
                setTimeout(() => {
                    window.URL.revokeObjectURL(url);
                }, 100);
            } else {
                // To plik - użyj standardowego endpointu download
                const response = await axiosInstance.get(`/nextcloud/files/download`, {
                    params: {
                        file: filePath
                    },
                    responseType: 'blob'
                });

                // Utwórz URL dla pobranego pliku
                const url = window.URL.createObjectURL(new Blob([response.data]));

                // Utwórz element 'a' do pobrania
                const link = document.createElement('a');
                link.href = url;

                // Ustaw nazwę pliku
                const fileName = filePath.split('/').pop() || 'file';
                link.setAttribute('download', fileName);

                // Dodaj, kliknij i usuń
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                // Zwolnij URL
                setTimeout(() => {
                    window.URL.revokeObjectURL(url);
                }, 100);
            }
        } catch (err) {
            console.error("Błąd podczas pobierania:", err);
            setError("Błąd podczas pobierania");
        }
    };

    // Toggle dla zaznaczania wszystkich plików
    const toggleSelectAll = (checked: boolean) => {
        const newSelected: SelectedFiles = { ...selectedFiles };
        Object.keys(selectedFiles).forEach(key => {
            newSelected[key] = checked;
        });
        setSelectedFiles(newSelected);
    };

    // Zmiana stanu pojedynczego checkboxa
    const handleCheckboxChange = (key: string, checked: boolean) => {
        setSelectedFiles({
            ...selectedFiles,
            [key]: checked
        });
    };

    // Pobieranie zaznaczonych plików
    const downloadSelected = async () => {
        // Dla pobierania plików nadal sprawdzamy uprawnienia
        if (!canDownloadFolder(folderPath)) {
            setError("Brak uprawnień do pobrania plików");
            return;
        }

        try {
            // Pobierz wybrane pliki
            const selectedKeys = Object.keys(selectedFiles).filter(key =>
                key !== 'all' && selectedFiles[key]
            );

            if (selectedKeys.length === 0) {
                return;
            }

            // Jeśli wybrano tylko jeden plik, pobierz go bezpośrednio
            if (selectedKeys.length === 1) {
                const downloadPath = `${folderPath}/${selectedKeys[0]}`;
                await downloadFile(downloadPath);
                return;
            }

            // Dla wielu plików, pobierz każdy plik z małym opóźnieniem
            for (let i = 0; i < selectedKeys.length; i++) {
                const key = selectedKeys[i];
                const downloadPath = `${folderPath}/${key}`;

                // Użyj setTimeout, aby dać przeglądarce czas na obsługę każdego pobierania
                setTimeout(() => {
                    downloadFile(downloadPath);
                }, i * 500); // 500ms opóźnienia między kolejnymi pobieraniami
            }
        } catch (err) {
            console.error("Błąd podczas pobierania zaznaczonych plików:", err);
            setError("Błąd podczas pobierania zaznaczonych plików");
        }
    };

    // Przełączanie trybu zaznaczania
    const toggleSelectionMode = () => {
        setSelectionMode(!selectionMode);
        setSelectedItems(new Set());
    };

    // Zaznaczanie/odznaczanie pliku
    const toggleItemSelection = (itemPath: string) => {
        const newSelection = new Set(selectedItems);

        if (newSelection.has(itemPath)) {
            newSelection.delete(itemPath);
        } else {
            newSelection.add(itemPath);
        }

        setSelectedItems(newSelection);
    };

    // Pobieranie zaznaczonych elementów
    const downloadSelectedItems = async () => {
        if (selectedItems.size === 0) return;

        // Sprawdź uprawnienia
        if (!canDownloadFolder(folderPath)) {
            setError("Brak uprawnień do pobrania plików");
            return;
        }

        try {
            // Dla pojedynczego pliku - użyj bezpośredniego pobierania
            if (selectedItems.size === 1) {
                const filePath = Array.from(selectedItems)[0];
                await downloadFile(filePath);
                return; // Dodane, aby przerwać funkcję po pobraniu
            }

            // Dla wielu plików użyj endpoint pobierania wielu plików
            const selectedPaths = Array.from(selectedItems);

            const response = await axiosInstance.post('/nextcloud/files/download-multiple', {
                paths: selectedPaths
            }, {
                responseType: 'blob'
            });

            // Utwórz link do pobrania
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;

            // Nazwa pliku ZIP z informacją o liczbie plików
            link.setAttribute('download', `produkt-${getProductName()}-${selectedItems.size}-plików.zip`);

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Zwolnij URL po pobraniu
            setTimeout(() => {
                window.URL.revokeObjectURL(url);
            }, 100);
        } catch (err) {
            console.error("Błąd podczas pobierania zaznaczonych plików:", err);
            setError("Błąd podczas pobierania zaznaczonych plików");
        }
    };

    // Przełączanie między obrazami w podglądzie
    const navigateImages = (direction: 'prev' | 'next') => {
        if (!currentImage) return;

        // Połącz obrazy z bieżącego folderu i wszystkie obrazy z podfolderów
        const allImageFiles = [
            ...folderContents.filter((file: FileInfo) =>
                file.contentType?.includes('image') ||
                file.name.match(/\.(jpg|jpeg|png|gif)$/i)
            ),
            ...allProductImages.filter(file =>
                // Usuń duplikaty (pliki, które są już w folderContents)
                !folderContents.some(mainFile => mainFile.path === file.path)
            )
        ];

        if (allImageFiles.length <= 1) return;

        const currentIndex = allImageFiles.findIndex(file => file.path === currentImage);
        let nextIndex;

        if (direction === 'next') {
            nextIndex = (currentIndex + 1) % allImageFiles.length;
        } else {
            nextIndex = (currentIndex - 1 + allImageFiles.length) % allImageFiles.length;
        }

        setCurrentImage(allImageFiles[nextIndex].path);
    };

    // Dodaj wyświetlanie informacji o źródle obrazu (podfolder)
    const getImageSourceInfo = () => {
        if (!currentImage) return "";

        // Wyjmij ścieżkę podfolderu, jeśli obraz jest z podfolderu
        const productPath = folderPath;
        const imagePath = currentImage;

        if (imagePath.startsWith(productPath) && imagePath !== productPath) {
            // Usuń ścieżkę produktu ze ścieżki obrazu
            const relativePath = imagePath.substring(productPath.length);

            // Sprawdź, czy obraz jest bezpośrednio w folderze produktu
            if (relativePath.startsWith('/') && !relativePath.substring(1).includes('/')) {
                return "Główny folder";
            }

            // Znajdź podfolder
            const parts = relativePath.split('/').filter(p => p);
            if (parts.length > 1) {
                return `Podfolder: ${parts[0]}`;
            }
        }

        return "";
    };

    // Sprawdź, czy użytkownik może pobierać pliki
    const canDownloadFiles = canDownloadFolder(folderPath);

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

    // // Render funkcji podglądu obrazu
    const renderImagePreview = () => {
        if (!currentImage) {
            return (
                <div className="image-placeholder">
                    <img src="/placeholder-image.png" alt={getProductName()} />
                </div>
            );
        }

        const sourceInfo = getImageSourceInfo();

        return (
            <div className="product-image-preview">
                {imageLoading ? (
                    <div className="loading-image">
                        Ładowanie obrazu...
                    </div>
                ) : currentImageBlobUrl ? (
                    <img
                        src={currentImageBlobUrl}
                        alt="Podgląd produktu"
                        className="preview-image"
                        onError={(e) => {
                            console.error("Błąd ładowania obrazu z blob URL");
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = "/placeholder-image.png";
                        }}
                    />
                ) : (
                    // Fallback - spróbuj załadować obraz bezpośrednio z URL
                    <img
                        src={`/nextcloud/files/download?file=${encodeURIComponent(currentImage)}&t=${Date.now()}`}
                        alt="Podgląd produktu"
                        className="preview-image"
                        onError={(e) => {
                            console.error("Błąd ładowania obrazu z URL");
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = "/placeholder-image.png";
                        }}
                    />
                )}
                <div className="image-navigation">
                    <button className="prev-button" onClick={() => navigateImages('prev')}>←</button>
                    <button className="next-button" onClick={() => navigateImages('next')}>→</button>
                </div>
                {sourceInfo && (
                    <div className="image-source-info">
                        {sourceInfo}
                    </div>
                )}
                <div className="image-counter">
                    {allProductImages.length > 0 ?
                        `${allProductImages.findIndex(img => img.path === currentImage) + 1} / ${allProductImages.length}` :
                        ""}
                </div>
            </div>
        );
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

                        <div className="product-view-layout">
                            <div className="product-image-section">
                                {renderImagePreview()}
                            </div>

                            <div className="product-info-section">
                                <div className="product-header">
                                    <h2>{getProductName()}</h2>
                                    <p className="product-sku">SKU: {getProductSku()}</p>
                                </div>

                                <div className="product-navigation">
                                    {currentSubFolder && (
                                        <button
                                            className="back-button"
                                            onClick={handleBackToMainFolder}
                                        >
                                            ← Powrót do głównego folderu
                                        </button>
                                    )}

                                    {/* Przycisk włączania trybu zaznaczania */}
                                    <button
                                        className={`selection-mode-button ${selectionMode ? 'active' : ''}`}
                                        onClick={toggleSelectionMode}
                                    >
                                        {selectionMode ? 'Wyłącz zaznaczanie' : 'Włącz zaznaczanie'}
                                    </button>

                                    {/* Przycisk pobierania wszystkich plików */}
                                    {!selectionMode && (
                                        <button
                                            className="download-all-button"
                                            onClick={downloadAllFiles}
                                            disabled={!canDownloadFiles}
                                        >
                                            Pobierz wszystkie
                                        </button>
                                    )}

                                    {/* Przyciski dla trybu zaznaczania */}
                                    {selectionMode && (
                                        <>
                                            <button
                                                className="select-all-button"
                                                onClick={() => {
                                                    // Zaznacz/odznacz wszystkie elementy
                                                    const allItems = [...subFolders, ...folderContents].map(item => item.path);

                                                    if (selectedItems.size === allItems.length) {
                                                        // Odznacz wszystkie
                                                        setSelectedItems(new Set());
                                                    } else {
                                                        // Zaznacz wszystkie
                                                        setSelectedItems(new Set(allItems));
                                                    }
                                                }}
                                            >
                                                {selectedItems.size === subFolders.length + folderContents.length ?
                                                    'Odznacz wszystkie' : 'Zaznacz wszystkie'}
                                            </button>

                                            {selectedItems.size > 0 && (
                                                <button
                                                    className="download-selected-button"
                                                    onClick={downloadSelectedItems}
                                                    disabled={!canDownloadFiles}
                                                >
                                                    Pobierz zaznaczone ({selectedItems.size})
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>

                                <div className="folder-content">
                                    <h3>
                                        {currentSubFolder ?
                                            `Zawartość: ${currentSubFolder.split('/').pop()}` :
                                            'Zawartość produktu'
                                        }
                                    </h3>

                                    {/* Lista podfolderów */}
                                    {subFolders.length > 0 && (
                                        <div className="subfolder-list">
                                            <h4>Podfoldery:</h4>
                                            <ul>
                                                {subFolders.map(folder => (
                                                    <li key={folder.path} className="subfolder-item">
                                                        {selectionMode ? (
                                                            <div className="selectable-item">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedItems.has(folder.path)}
                                                                    onChange={() => toggleItemSelection(folder.path)}
                                                                />
                                                                <span>{folder.name}</span>

                                                                <div className="subfolder-actions">
                                                                    <button
                                                                        className="open-folder-button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleSubFolderClick(folder.path);
                                                                        }}
                                                                    >
                                                                        Otwórz
                                                                    </button>

                                                                    <button
                                                                        className="download-folder-button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            downloadFile(folder.path);
                                                                        }}
                                                                        disabled={!canDownloadFiles}
                                                                    >
                                                                        Pobierz
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="folder-item" onClick={() => handleSubFolderClick(folder.path)}>
                                                                <span className="folder-icon">📁</span>
                                                                <span className="folder-name">{folder.name}</span>

                                                                <div className="folder-actions">
                                                                    <button
                                                                        className="open-folder-button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleSubFolderClick(folder.path);
                                                                        }}
                                                                    >
                                                                        Otwórz
                                                                    </button>

                                                                    <button
                                                                        className="download-folder-button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            downloadFile(folder.path);
                                                                        }}
                                                                        disabled={!canDownloadFiles}
                                                                    >
                                                                        Pobierz
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Lista plików */}
                                    {folderContents.length > 0 && (
                                        <div className="file-list">
                                            <h4>Pliki:</h4>
                                            <ul>
                                                {folderContents.map(file => (
                                                    <li key={file.path} className="file-item">
                                                        {selectionMode ? (
                                                            <div className="selectable-item">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedItems.has(file.path)}
                                                                    onChange={() => toggleItemSelection(file.path)}
                                                                />
                                                                <span>{file.name}</span>

                                                                <div className="file-actions">
                                                                    {file.contentType?.includes('image') ||
                                                                    file.name.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                                                                        <button
                                                                            className="preview-button"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleImagePreview(file.path);
                                                                            }}
                                                                        >
                                                                            Podgląd
                                                                        </button>
                                                                    ) : (
                                                                        <button
                                                                            className="open-file-button"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                // Zamiast otwierania w nowej karcie, użyj downloadFile
                                                                                downloadFile(file.path);
                                                                            }}
                                                                        >
                                                                            Otwórz
                                                                        </button>
                                                                    )}

                                                                    <button
                                                                        className="download-file-button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            downloadFile(file.path);
                                                                        }}
                                                                        disabled={!canDownloadFiles}
                                                                    >
                                                                        Pobierz
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="file-item">
                                                                <span className="file-icon">
                                                                    {file.contentType?.includes('image') ||
                                                                    file.name.match(/\.(jpg|jpeg|png|gif)$/i) ? '🖼️' : '📄'}
                                                                </span>
                                                                <span className="file-name">{file.name}</span>

                                                                <div className="file-actions">
                                                                    {file.contentType?.includes('image') ||
                                                                    file.name.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                                                                        <button
                                                                            className="preview-button"
                                                                            onClick={() => handleImagePreview(file.path)}
                                                                        >
                                                                            Podgląd
                                                                        </button>
                                                                    ) : (
                                                                        <button
                                                                            className="open-file-button"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                window.open(`/nextcloud/files/download?file=${file.path}`, '_blank');
                                                                            }}
                                                                        >
                                                                            Otwórz
                                                                        </button>
                                                                    )}

                                                                    <button
                                                                        className="download-file-button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            downloadFile(file.path);
                                                                        }}
                                                                        disabled={!canDownloadFiles}
                                                                    >
                                                                        Pobierz
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {subFolders.length === 0 && folderContents.length === 0 && (
                                        <div className="empty-folder-message">
                                            <p>Ten folder jest pusty</p>
                                        </div>
                                    )}
                                </div>

                                {/* Stara sekcja pobierania */}
                                {productInfo && productInfo.imageTypes && productInfo.imageTypes.length > 0 && (
                                    <div className="download-section legacy">
                                        <h3>Dostępne formaty plików</h3>
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