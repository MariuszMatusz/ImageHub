import React, { useState, useEffect } from "react";
import axiosInstance from "../utils/axiosInstance";
import "../styles/PermissionManagement.css";

interface User {
    id: number;
    username: string;
    email: string;
    role: string;
}

interface Permission {
    id: number;
    folderPath: string;
    userId: number;
    username: string;
    canRead: boolean;
    canWrite: boolean;
    canDelete: boolean;
    includeSubfolders: boolean;
}

interface Folder {
    name: string;
    path: string;
    isDirectory: boolean;
    children?: Folder[];
}

const PermissionManagement: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [folders, setFolders] = useState<Folder[]>([]);
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [selectedUser, setSelectedUser] = useState<number | null>(null);
    const [selectedFolder, setSelectedFolder] = useState("");
    const [canRead, setCanRead] = useState(true);
    const [canWrite, setCanWrite] = useState(false);
    const [canDelete, setCanDelete] = useState(false);
    const [includeSubfolders, setIncludeSubfolders] = useState(false);
    const [message, setMessage] = useState("");

    useEffect(() => {
        // Pobierz listę użytkowników
        axiosInstance.get("/users")
            .then(response => setUsers(response.data))
            .catch(error => console.error("Error fetching users:", error));

        // Pobierz listę folderów
        axiosInstance.get("/nextcloud/files", {
            params: {
                includeChildren: true,
                depth: 5
            }
        })
            .then(response => setFolders(response.data))
            .catch(error => console.error("Error fetching folders:", error));
    }, []);

    // Pobierz uprawnienia dla wybranego użytkownika
    useEffect(() => {
        if (selectedUser) {
            axiosInstance.get(`/folder-permissions/user/${selectedUser}`)
                .then(response => setPermissions(response.data))
                .catch(error => console.error("Error fetching permissions:", error));
        } else {
            setPermissions([]);
        }
    }, [selectedUser]);

    // Przetwarzanie listy folderów do formatu dla selecta
    const flattenFolders = (folders: Folder[], prefix = ""): { name: string, path: string }[] => {
        let result: { name: string, path: string }[] = [];

        folders.forEach(folder => {
            if (folder.isDirectory) {
                const fullPath = folder.path;
                const displayName = prefix + folder.name;
                result.push({ name: displayName, path: fullPath });

                if (folder.children && folder.children.length > 0) {
                    result = result.concat(flattenFolders(folder.children, displayName + " / "));
                }
            }
        });

        return result;
    };

    const flattenedFolders = flattenFolders(folders);

    // Dodaj nowe uprawnienie
    const addPermission = () => {
        if (!selectedUser || !selectedFolder) {
            setMessage("Wybierz użytkownika i folder");
            return;
        }

        axiosInstance.post("/folder-permissions", null, {
            params: {
                userId: selectedUser,
                folderPath: selectedFolder,
                canRead: canRead,
                canWrite: canWrite,
                canDelete: canDelete,
                includeSubfolders: includeSubfolders
            }
        })
            .then(response => {
                setPermissions([...permissions, response.data]);
                setMessage("Uprawnienia dodane pomyślnie");
            })
            .catch(error => {
                console.error("Error adding permission:", error);
                setMessage("Błąd podczas dodawania uprawnienia");
            });
    };

    // Usuń uprawnienie
    const removePermission = (id: number) => {
        axiosInstance.delete(`/folder-permissions/${id}`)
            .then(() => {
                setPermissions(permissions.filter(p => p.id !== id));
                setMessage("Uprawnienie usunięte pomyślnie");
            })
            .catch(error => {
                console.error("Error removing permission:", error);
                setMessage("Błąd podczas usuwania uprawnienia");
            });
    };

    return (
        <div className="permission-management">
            <h2>Zarządzanie uprawnieniami folderów</h2>

            {message && <div className="message">{message}</div>}

            <div className="form-section">
                <h3>Dodaj nowe uprawnienie</h3>

                <div className="form-group">
                    <label>Użytkownik:</label>
                    <select value={selectedUser || ""} onChange={e => setSelectedUser(Number(e.target.value))}>
                        <option value="">Wybierz użytkownika</option>
                        {users.map(user => (
                            <option key={user.id} value={user.id}>{user.username} ({user.email})</option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label>Folder:</label>
                    <select value={selectedFolder} onChange={e => setSelectedFolder(e.target.value)}>
                        <option value="">Wybierz folder</option>
                        {flattenedFolders.map((folder, index) => (
                            <option key={index} value={folder.path}>{folder.name}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group permissions-checkboxes">
                    <label>
                        <input type="checkbox" checked={canRead} onChange={e => setCanRead(e.target.checked)} />
                        Odczyt
                    </label>
                    <label>
                        <input type="checkbox" checked={canWrite} onChange={e => setCanWrite(e.target.checked)} />
                        Zapis
                    </label>
                    <label>
                        <input type="checkbox" checked={canDelete} onChange={e => setCanDelete(e.target.checked)} />
                        Usuwanie
                    </label>
                    <label>
                        <input type="checkbox" checked={includeSubfolders} onChange={e => setIncludeSubfolders(e.target.checked)} />
                        Uwzględnij podfoldery
                    </label>
                </div>

                <button onClick={addPermission}>Dodaj uprawnienie</button>
            </div>

            <div className="permissions-list">
                <h3>Aktualne uprawnienia</h3>

                <div className="user-filter">
                    <label>Filtruj według użytkownika:</label>
                    <select value={selectedUser || ""} onChange={e => setSelectedUser(Number(e.target.value))}>
                        <option value="">Wszyscy użytkownicy</option>
                        {users.map(user => (
                            <option key={user.id} value={user.id}>{user.username}</option>
                        ))}
                    </select>
                </div>

                <table>
                    <thead>
                    <tr>
                        <th>Użytkownik</th>
                        <th>Folder</th>
                        <th>Uprawnienia</th>
                        <th>Podfoldery</th>
                        <th>Akcje</th>
                    </tr>
                    </thead>
                    <tbody>
                    {permissions.map(permission => (
                        <tr key={permission.id}>
                            <td>{permission.username}</td>
                            <td>{permission.folderPath}</td>
                            <td>
                                {permission.canRead ? "Odczyt " : ""}
                                {permission.canWrite ? "Zapis " : ""}
                                {permission.canDelete ? "Usuwanie" : ""}
                            </td>
                            <td>{permission.includeSubfolders ? "Tak" : "Nie"}</td>
                            <td>
                                <button onClick={() => removePermission(permission.id)}>Usuń</button>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>

                {permissions.length === 0 && <p>Brak uprawnień</p>}
            </div>
        </div>
    );
};

export default PermissionManagement;