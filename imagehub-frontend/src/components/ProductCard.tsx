import React, { useState, useEffect } from 'react';
import '../styles/ProductCard.css';
import axiosInstance from "../utils/axiosInstance";

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

interface SelectedFiles {
    all: boolean;
    Detail_JPG: boolean;
    Detail_PNG: boolean;
    '360_PNG': boolean;
    FULL_JPG: boolean;
    FULL_PNG: boolean;
    [key: string]: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({ folderPath, onClose }) => {
    const [productInfo, setProductInfo] = useState<ProductInfo | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedFiles, setSelectedFiles] = useState<SelectedFiles>({
        all: false,
        Detail_JPG: false,
        Detail_PNG: false,
        '360_PNG': false,
        FULL_JPG: false,
        FULL_PNG: false
    });

    useEffect(() => {
        const fetchProductInfo = async () => {
            try {
                const response = await axiosInstance.get('/nextcloud/product-info', {
                    params: { path: folderPath }
                });
                setProductInfo(response.data);
            } catch (err) {
                console.error("Error fetching product info:", err);
                setError("Nie udało się pobrać informacji o produkcie");
            } finally {
                setLoading(false);
            }
        };

        fetchProductInfo();
    }, [folderPath]);

    const handleDownload = (fileType: string) => {
        // Implement download functionality
        window.open(`/nextcloud/files/download?file=${folderPath}/${fileType}`, '_blank');
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
        // Implement download of selected files
        Object.keys(selectedFiles).forEach(key => {
            if (key !== 'all' && selectedFiles[key]) {
                handleDownload(key);
            }
        });
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
                    <div className="error">{error}</div>
                ) : (
                    <>
                        <div className="product-image">
                            <img src="/placeholder-image.png" alt={productInfo?.name || "Product"} />
                            <div className="image-navigation">
                                <button className="prev-button">←</button>
                                <button className="next-button">→</button>
                            </div>
                        </div>

                        <div className="product-info">
                            <h2>Product information</h2>

                            <div className="product-details">
                                <div className="detail-row">
                                    <span className="detail-label">Product name</span>
                                    <span className="detail-value">{productInfo?.name || "Unknown"}</span>
                                </div>

                                <div className="detail-row">
                                    <span className="detail-label">SKU</span>
                                    <span className="detail-value">{productInfo?.sku || "KRASD32SD2332322"}</span>
                                </div>
                            </div>

                            <div className="download-section">
                                <div className="download-dropdown">
                                    <button className="download-button">Download</button>
                                    <div className="download-options">
                                        <label>
                                            <input
                                                type="checkbox"
                                                checked={selectedFiles.all}
                                                onChange={(e) => toggleSelectAll(e.target.checked)}
                                            /> Download all
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
                                        <button className="download-selected" onClick={downloadSelected}>DOWNLOAD</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default ProductCard;