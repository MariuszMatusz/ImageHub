import React, { useState } from "react";
import "../styles/AdminPanel.css";
import UserManagement from "./UserManagement";
import FolderPermissions from "./FolderPermissions";
import RoleManagement from "./RoleManagement";
import UserProfile from "./UserProfile";
import ProductFolderManagement from "./ProductFolderManagement";

const AdminPanel: React.FC = () => {
    const [activeTab, setActiveTab] = useState<string>("userProfile");

    // Renderowanie odpowiedniego komponentu na podstawie aktywnej karty
    const renderContent = () => {
        switch (activeTab) {
            case "userProfile":
                return <UserProfile />;
            case "userManagement":
                return <UserManagement />;
            case "folderPermissions":
                return <FolderPermissions />;
            case "roleManagement":
                return <RoleManagement />;
            case "productFolders":
                return <ProductFolderManagement />;
            default:
                return <UserProfile />;
        }
    };

    return (
        <div className="admin-panel-container">
            <div className="admin-sidebar">
                <h2>Panel Administratora</h2>
                <div className="admin-menu">
                    <button
                        className={`admin-menu-item ${activeTab === "userProfile" ? "active" : ""}`}
                        onClick={() => setActiveTab("userProfile")}
                    >
                        Profil użytkownika
                    </button>
                    <button
                        className={`admin-menu-item ${activeTab === "userManagement" ? "active" : ""}`}
                        onClick={() => setActiveTab("userManagement")}
                    >
                        Zarządzanie użytkownikami
                    </button>
                    <button
                        className={`admin-menu-item ${activeTab === "folderPermissions" ? "active" : ""}`}
                        onClick={() => setActiveTab("folderPermissions")}
                    >
                        Uprawnienia folderów
                    </button>
                    <button
                        className={`admin-menu-item ${activeTab === "roleManagement" ? "active" : ""}`}
                        onClick={() => setActiveTab("roleManagement")}
                    >
                        Zarządzanie rolami
                    </button>
                    <button
                        className={`admin-menu-item ${activeTab === "productFolders" ? "active" : ""}`}
                        onClick={() => setActiveTab("productFolders")}
                    >
                        Foldery produktowe
                    </button>
                </div>
                <div className="admin-sidebar-footer">
                    <button
                        className="back-to-dashboard-btn"
                        onClick={() => window.location.href = "/dashboard"}
                    >
                        Powrót do zarządzania plikami
                    </button>
                </div>
            </div>
            <div className="admin-content">
                {renderContent()}
            </div>
        </div>
    );
};

export default AdminPanel;