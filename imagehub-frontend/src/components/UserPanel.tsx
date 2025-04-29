import React, { useState } from "react";
import "../styles/UserPanel.css";
import UserProfile from "./UserProfile";

const UserPanel: React.FC = () => {
    const [activeTab, setActiveTab] = useState<string>("userProfile");

    // Render the appropriate component based on the active tab
    const renderContent = () => {
        switch (activeTab) {
            case "userProfile":
                return <UserProfile />;

        }
    };

    return (
        <div className="user-panel-container">
            <div className="user-sidebar">
                <h2>Panel Użytkownika</h2>
                <div className="user-menu">
                    <button
                        className={`user-menu-item ${activeTab === "userProfile" ? "active" : ""}`}
                        onClick={() => setActiveTab("userProfile")}
                    >
                        Profil użytkownika
                    </button>

                </div>
                <div className="user-sidebar-footer">
                    <button
                        className="back-to-dashboard-btn"
                        onClick={() => window.location.href = "/dashboard"}
                    >
                        Powrót do zarządzania plikami
                    </button>
                </div>
            </div>
            <div className="user-content">
                {renderContent()}
            </div>
        </div>
    );
};

export default UserPanel;