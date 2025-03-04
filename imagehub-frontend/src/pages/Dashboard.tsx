import React, { useState, useEffect } from "react";
import "../styles/Dashboard.css";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import FolderGrid from "../components/FolderGrid";
import axios from "axios";
import axiosInstance from "../utils/axiosInstance";

const Dashboard: React.FC = () => {
    const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
    const [folders, setFolders] = useState([]);

    useEffect(() => {
        axiosInstance.get("/folders/my-folders", {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        })
            .then(response => setFolders(response.data))
            .catch(error => console.error("Error fetching folders:", error));
    }, []);

    return (

        <div className="dashboard-container">
            <Navbar />
            <div className="dashboard-content">
                <Sidebar folders={folders} setSelectedFolderId={setSelectedFolderId} />
                <div className="content-area">
                    <FolderGrid parentFolderId={selectedFolderId} />
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
