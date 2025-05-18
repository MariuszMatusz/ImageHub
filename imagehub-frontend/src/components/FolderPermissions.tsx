import React, { useEffect, useState } from "react";
import axiosInstance from "../utils/axiosInstance";
import "../styles/FolderPermissions.css";

interface User {
    id: number;
    username: string;
    email: string;
    role: {
        id: number;
        name: string;
        permissions: string[];
    };
}

interface Folder {
    name: string;
    path: string;
    isDirectory: boolean;
    children?: Folder[];
}

interface Permission {
    id: number;
    folderPath: string;
    userId: number;
    username: string;
    canRead: boolean;
    canWrite: boolean;
    canDelete: boolean;
    canDownload: boolean; // Nowe pole dla uprawnienia pobierania
    includeSubfolders: boolean;
}

const FolderPermissions: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [folders, setFolders] = useState<Folder[]>([]);
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [selectedUser, setSelectedUser] = useState<number | null>(null);
    const [selectedFolder, setSelectedFolder] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState<{
        type: 'success' | 'error';
        text: string;
    } | null>(null);

    // Stany formularzy do dodawania/edytowania uprawnień
    const [showPermissionForm, setShowPermissionForm] = useState<boolean>(false);
    const [newPermission, setNewPermission] = useState<{
        canRead: boolean;
        canWrite: boolean;
        canDelete: boolean;
        canDownload: boolean; // Nowe pole dla uprawnienia pobierania
        includeSubfolders: boolean;
    }>({
        canRead: true,
        canWrite: false,
        canDelete: false,
        canDownload: true, // Domyślnie włączone, bo jeśli użytkownik ma dostęp do odczytu, to zwykle chcemy mu także dać możliwość pobierania
        includeSubfolders: false
    });

    //
    // Załaduj użytkowników, foldery i uprawnienia podczas montowania komponentu
    useEffect(() => {
        fetchUsers();
        fetchFolders();
    }, []);

    useEffect(() => {
        if (selectedUser) {
            fetchUserPermissions(selectedUser);
        } else {
            setPermissions([]);
        }
    }, [selectedUser]);

    const fetchUsers = async () => {
        try {
            const response = await axiosInstance.get("/users");
            setUsers(response.data);
        } catch (err) {
            setError("Nie udało się pobrać listy użytkowników.");
            console.error("Error fetching users:", err);
        }
    };

    const fetchFolders = async () => {
        setLoading(true);
        try {
            const response = await axiosInstance.get("/nextcloud/files", {
                params: {
                    path: "",
                    includeChildren: true,
                    depth: 3
                }
            });
            setFolders(response.data);
        } catch (err) {
            setError("Nie udało się pobrać listy folderów.");
            console.error("Error fetching folders:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchUserPermissions = async (userId: number) => {
        try {
            const response = await axiosInstance.get(`/folder-permissions/user/${userId}`);
            setPermissions(response.data);
        } catch (err) {
            setError("Nie udało się pobrać uprawnień użytkownika.");
            console.error("Error fetching user permissions:", err);
        }
    };

    const handleAddPermission = async () => {
        if (!selectedUser || !selectedFolder) {
            setStatusMessage({
                type: 'error',
                text: "Wybierz użytkownika i folder, aby dodać uprawnienia."
            });
            return;
        }

        try {
            await axiosInstance.post("/folder-permissions", null, {
                params: {
                    userId: selectedUser,
                    folderPath: selectedFolder,
                    canRead: newPermission.canRead,
                    canWrite: newPermission.canWrite,
                    canDelete: newPermission.canDelete,
                    canDownload: newPermission.canDownload,
                    includeSubfolders: newPermission.includeSubfolders
                }
            });

            setStatusMessage({
                type: 'success',
                text: "Uprawnienia zostały dodane pomyślnie."
            });

            // Zresetuj formularz i odśwież uprawnienia
            setShowPermissionForm(false);
            setSelectedFolder("");
            setNewPermission({
                canRead: true,
                canWrite: false,
                canDelete: false,
                canDownload: true, // Resetujemy do domyślnej wartości
                includeSubfolders: false
            });

            if (selectedUser) {
                fetchUserPermissions(selectedUser);
            }
        } catch (err) {
            setStatusMessage({
                type: 'error',
                text: "Nie udało się dodać uprawnień."
            });
            console.error("Error adding permission:", err);
        }
    };

    const handleDeletePermission = async (permissionId: number) => {
        if (!window.confirm("Czy na pewno chcesz usunąć te uprawnienia?")) {
            return;
        }

        try {
            await axiosInstance.delete(`/folder-permissions/${permissionId}`);

            setStatusMessage({
                type: 'success',
                text: "Uprawnienia zostały usunięte pomyślnie."
            });

            // Odśwież uprawnienia
            if (selectedUser) {
                fetchUserPermissions(selectedUser);
            }
        } catch (err) {
            setStatusMessage({
                type: 'error',
                text: "Nie udało się usunąć uprawnień."
            });
            console.error("Error deleting permission:", err);
        }
    };

    // Funkcja pomocnicza do rekurencyjnego renderowania opcji folderów
    const renderFolderOptions = (folders: Folder[], level = 0) => {
        return folders
            .filter(folder => folder.isDirectory) // Filtruj tylko katalogi
            .map(folder => {
                const indent = "\u00A0".repeat(level * 4);

                const options = [(
                    <option key={folder.path} value={folder.path}>
                        {indent}{folder.name}
                    </option>
                )];

                if (folder.children && folder.children.length > 0) {
                    options.push(...renderFolderOptions(folder.children, level + 1));
                }

                return options;
            }).flat();
    };

    const clearStatusMessage = () => {
        setStatusMessage(null);
    };

    // Dodatkowa funkcja zapewniająca, że jeśli użytkownik ma uprawnienia do odczytu,
    // domyślnie przyznajemy też pobieranie
    const handleReadPermissionChange = (checked: boolean) => {
        if (checked) {
            // Jeśli włączamy odczyt, automatycznie włączamy też pobieranie
            setNewPermission({...newPermission, canRead: checked, canDownload: true});
        } else {
            // Jeśli wyłączamy odczyt, wyłączamy też pobieranie
            setNewPermission({...newPermission, canRead: checked, canDownload: false});
        }
    };

    if (loading && folders.length === 0) {
        return <div className="loading-message">Ładowanie danych...</div>;
    }

    return (
        <div className="folder-permissions-container">
            <h2>Uprawnienia do folderów</h2>

            {statusMessage && (
                <div className={`status-message ${statusMessage.type}`}>
                    {statusMessage.text}
                    <button className="close-btn" onClick={clearStatusMessage}>×</button>
                </div>
            )}

            <div className="user-selector">
                <label htmlFor="user-select">Wybierz użytkownika:</label>
                <select
                    id="user-select"
                    value={selectedUser || ""}
                    onChange={(e) => setSelectedUser(e.target.value ? Number(e.target.value) : null)}
                >
                    <option value="">-- Wybierz użytkownika --</option>
                    {users.map(user => (
                        <option key={user.id} value={user.id}>
                            {user.username} ({user.email})
                        </option>
                    ))}
                </select>
            </div>

            {selectedUser && (
                <div className="permissions-section">
                    <div className="permissions-header">
                        <h3>
                            Uprawnienia dla: {users.find(u => u.id === selectedUser)?.username}
                        </h3>
                        <button
                            className="add-permission-btn"
                            onClick={() => setShowPermissionForm(!showPermissionForm)}
                        >
                            {showPermissionForm ? "Anuluj" : "Dodaj uprawnienie"}
                        </button>
                    </div>

                    {showPermissionForm && (
                        <div className="permission-form">
                            <div className="form-group">
                                <label htmlFor="folder-select">Folder:</label>
                                <select
                                    id="folder-select"
                                    value={selectedFolder}
                                    onChange={(e) => setSelectedFolder(e.target.value)}
                                >
                                    <option value="">-- Wybierz folder --</option>
                                    {renderFolderOptions(folders)}
                                </select>
                            </div>

                            <div className="permission-checkboxes">
                                <div className="checkbox-group">
                                    <input
                                        type="checkbox"
                                        id="can-read"
                                        checked={newPermission.canRead}
                                        onChange={(e) => handleReadPermissionChange(e.target.checked)}
                                    />
                                    <label htmlFor="can-read">Odczyt</label>
                                </div>

                                {/* Nowy checkbox dla uprawnienia pobierania */}
                                <div className="checkbox-group">
                                    <input
                                        type="checkbox"
                                        id="can-download"
                                        checked={newPermission.canDownload}
                                        onChange={(e) => setNewPermission({...newPermission, canDownload: e.target.checked})}
                                        disabled={!newPermission.canRead} // Pobieranie wymaga uprawnienia odczytu
                                    />
                                    <label htmlFor="can-download">Pobieranie</label>
                                </div>

                                <div className="checkbox-group">
                                    <input
                                        type="checkbox"
                                        id="can-write"
                                        checked={newPermission.canWrite}
                                        onChange={(e) => setNewPermission({...newPermission, canWrite: e.target.checked})}
                                    />
                                    <label htmlFor="can-write">Zapis</label>
                                </div>

                                <div className="checkbox-group">
                                    <input
                                        type="checkbox"
                                        id="can-delete"
                                        checked={newPermission.canDelete}
                                        onChange={(e) => setNewPermission({...newPermission, canDelete: e.target.checked})}
                                    />
                                    <label htmlFor="can-delete">Usuwanie</label>
                                </div>

                                <div className="checkbox-group">
                                    <input
                                        type="checkbox"
                                        id="include-subfolders"
                                        checked={newPermission.includeSubfolders}
                                        onChange={(e) => setNewPermission({...newPermission, includeSubfolders: e.target.checked})}
                                    />
                                    <label htmlFor="include-subfolders">Dotyczy podfolderów</label>
                                </div>
                            </div>

                            <div className="form-actions">
                                <button
                                    className="save-btn"
                                    onClick={handleAddPermission}
                                    disabled={!selectedFolder}
                                >
                                    Dodaj uprawnienie
                                </button>
                            </div>
                        </div>
                    )}

                    {permissions.length === 0 ? (
                        <div className="no-permissions">
                            Użytkownik nie ma przypisanych uprawnień do folderów.
                        </div>
                    ) : (
                        <table className="permissions-table">
                            <thead>
                            <tr>
                                <th>Folder</th>
                                <th>Odczyt</th>
                                <th>Pobieranie</th> {/* Nowa kolumna */}
                                <th>Zapis</th>
                                <th>Usuwanie</th>
                                <th>Podfoldery</th>
                                <th>Akcje</th>
                            </tr>
                            </thead>
                            <tbody>
                            {permissions.map(permission => (
                                <tr key={permission.id}>
                                    <td>{permission.folderPath}</td>
                                    <td>
                                        <span className={permission.canRead ? "yes" : "no"}>
                                            {permission.canRead ? "Tak" : "Nie"}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={permission.canDownload ? "yes" : "no"}>
                                            {permission.canDownload ? "Tak" : "Nie"}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={permission.canWrite ? "yes" : "no"}>
                                            {permission.canWrite ? "Tak" : "Nie"}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={permission.canDelete ? "yes" : "no"}>
                                            {permission.canDelete ? "Tak" : "Nie"}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={permission.includeSubfolders ? "yes" : "no"}>
                                            {permission.includeSubfolders ? "Tak" : "Nie"}
                                        </span>
                                    </td>
                                    <td>
                                        <button
                                            className="delete-btn"
                                            onClick={() => handleDeletePermission(permission.id)}
                                        >
                                            Usuń
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    );
};

export default FolderPermissions;