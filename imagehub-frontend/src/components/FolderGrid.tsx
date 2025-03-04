import React, { useState, useEffect } from "react";
import axios from "axios";
import "../styles/FolderGrid.css";

// Definicja interfejsu Folder
interface Folder {
    id: number;
    name: string;
}

interface FolderGridProps {
    parentFolderId: number | null;
}

const FolderGrid: React.FC<FolderGridProps> = ({ parentFolderId }) => {
    const [subfolders, setSubfolders] = useState<Folder[]>([]); // 🟢 Ustawienie poprawnego typu

    useEffect(() => {
        if (parentFolderId !== null) {
            axios.get(`http://localhost:8080/api/folders/subfolders?parentFolderId=${parentFolderId}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
            })
                .then(response => setSubfolders(response.data))
                .catch(error => console.error("Error fetching subfolders:", error));

        }
    }, [parentFolderId]);

    return (
        <div className="folder-grid">
            {subfolders.map((folder: Folder) => ( // 🟢 Określenie typu `folder`
                <div key={folder.id} className="folder-card">
                    <div className="folder-image">📁</div>
                    <div className="folder-details">
                        <h3>{folder.name}</h3>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default FolderGrid;
