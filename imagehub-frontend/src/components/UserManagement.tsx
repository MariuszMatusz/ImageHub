import React, { useEffect, useState } from "react";
import axiosInstance from "../utils/axiosInstance";
import "../styles/UserManagement.css";
import { AxiosError } from "axios";

// Zdefiniujmy prawidłowy interfejs Role
interface Role {
    id: number;
    name: string;
    description?: string;
    permissions: string[];
    systemRole?: boolean;
}

interface User {
    id: number;
    username: string;
    email: string;
    role: Role; // Zmiana z string na obiekt Role
}

interface NewUser {
    username: string;
    email: string;
    password: string;
    roleId: number; // Używamy ID roli zamiast nazwy
}

const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState<{
        type: 'success' | 'error';
        text: string;
    } | null>(null);

    // Edit user state
    const [editingUserId, setEditingUserId] = useState<number | null>(null);
    const [editedUser, setEditedUser] = useState<{
        username: string;
        email: string;
        roleId: number;
        password: string;
    }>({
        username: '',
        email: '',
        roleId: 0,
        password: ''
    });

    // New user state
    const [showAddUserForm, setShowAddUserForm] = useState<boolean>(false);
    const [newUser, setNewUser] = useState<NewUser>({
        username: '',
        email: '',
        password: '',
        roleId: 0
    });

    // Load users and roles on component mount
    useEffect(() => {
        Promise.all([
            fetchUsers(),
            fetchRoles()
        ]).then(() => {
            setLoading(false);
        });
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await axiosInstance.get("/users");
            setUsers(response.data);
            setError(null);
            return response.data;
        } catch (error) {
            setError("Nie udało się pobrać listy użytkowników.");
            console.error("Error fetching users:", error);
            return [];
        }
    };

    const fetchRoles = async () => {
        try {
            const response = await axiosInstance.get("/roles");
            setRoles(response.data);

            // Ustaw domyślne roleId dla nowego użytkownika i edytowanego użytkownika
            const defaultRole = response.data.find((role: Role) => role.name === "USER");
            if (defaultRole) {
                setNewUser(prev => ({ ...prev, roleId: defaultRole.id }));
                setEditedUser(prev => ({ ...prev, roleId: defaultRole.id }));
            }

            return response.data;
        } catch (error) {
            console.error("Error fetching roles:", error);
            return [];
        }
    };

    // Funkcja pomocnicza do bezpiecznego wydobycia nazwy roli
    const getRoleName = (role: any): string => {
        if (!role) return '';
        if (typeof role === 'string') return role;
        if (typeof role === 'object' && role.name) return role.name;
        return '';
    };

    const handleEditUser = (user: User) => {
        setEditingUserId(user.id);
        setEditedUser({
            username: user.username,
            email: user.email,
            roleId: user.role.id,
            password: '' // Password field is empty when editing
        });
    };

    const handleCancelEdit = () => {
        setEditingUserId(null);
    };

    const handleUpdateUser = async (id: number) => {
        console.log("Edycja użytkownika ID:", id);
        console.log("Dane edytowanego użytkownika:", editedUser);

        try {
            // Pobieramy aktualnego użytkownika
            const currentUserResponse = await axiosInstance.get(`/users/${id}`);
            const currentUser = currentUserResponse.data;
            console.log("Aktualny użytkownik:", currentUser);

            // Znajdź rolę na podstawie wybranego roleId
            const selectedRole = roles.find(role => role.id === editedUser.roleId);
            console.log("Znaleziona rola:", selectedRole);

            if (!selectedRole) {
                throw new Error("Nie wybrano właściwej roli");
            }

            const updateData: any = {
                username: editedUser.username,
                email: editedUser.email,
                role: selectedRole
            };

// Dodaj hasło tylko jeśli zostało wprowadzone
            if (editedUser.password && editedUser.password.trim() !== '') {
                updateData.password = editedUser.password;
            }

            console.log("Dane wysyłane do API:", updateData);



            await axiosInstance.put(`/users/${id}`, updateData);
            setStatusMessage({
                type: 'success',
                text: `Użytkownik ${editedUser.username} został zaktualizowany.`
            });
            setEditingUserId(null);
            fetchUsers(); // Refresh the user list
        } catch (error) {
            console.error("Error updating user:", error);

            // Wyświetl bardziej szczegółową informację o błędzie
            let errorMessage = "Nie udało się zaktualizować użytkownika.";
            const axiosError = error as AxiosError<any>;

            if (axiosError.response) {
                console.log("Pełna odpowiedź błędu:", axiosError.response);
                const responseData = axiosError.response.data;
                errorMessage += ` Szczegóły: ${typeof responseData === 'string' ? responseData : JSON.stringify(responseData)}`;
            }

            setStatusMessage({
                type: 'error',
                text: errorMessage
            });
        }
    };

    const handleDeleteUser = async (id: number, username: string) => {
        if (!window.confirm(`Czy na pewno chcesz usunąć użytkownika ${username}?`)) {
            return;
        }

        try {
            await axiosInstance.delete(`/users/${id}`);
            setStatusMessage({
                type: 'success',
                text: `Użytkownik ${username} został usunięty.`
            });
            fetchUsers(); // Refresh the user list
        } catch (error) {
            setStatusMessage({
                type: 'error',
                text: "Nie udało się usunąć użytkownika."
            });
            console.error("Error deleting user:", error);
        }
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate form
        if (!newUser.username || !newUser.email || !newUser.password || newUser.roleId === 0) {
            setStatusMessage({
                type: 'error',
                text: "Wszystkie pola są wymagane."
            });
            return;
        }

        try {
            // Znajdź rolę na podstawie wybranego roleId
            const selectedRole = roles.find(role => role.id === newUser.roleId);
            console.log("Wybrana rola:", selectedRole);

            if (!selectedRole) {
                throw new Error("Nie wybrano właściwej roli");
            }

            const userData = {
                username: newUser.username,
                email: newUser.email,
                password: newUser.password,
                role: selectedRole // Przekazujemy pełny obiekt roli
            };

            console.log("Wysyłam dane nowego użytkownika:", userData);
            await axiosInstance.post("/users", userData);
            setStatusMessage({
                type: 'success',
                text: `Użytkownik ${newUser.username} został dodany.`
            });
            setShowAddUserForm(false);
            setNewUser({
                username: '',
                email: '',
                password: '',
                roleId: selectedRole.id
            });
            fetchUsers(); // Refresh the user list
        } catch (error) {
            console.error("Error adding user:", error);

            // Wyświetl bardziej szczegółową informację o błędzie
            let errorMessage = "Nie udało się dodać użytkownika.";
            const axiosError = error as AxiosError<any>;

            if (axiosError.response && axiosError.response.data) {
                console.log("Pełna odpowiedź błędu:", axiosError.response);
                const responseData = axiosError.response.data;
                errorMessage += ` Szczegóły: ${typeof responseData === 'string' ? responseData : JSON.stringify(responseData)}`;
            }

            setStatusMessage({
                type: 'error',
                text: errorMessage
            });
        }
    };

    const clearStatusMessage = () => {
        setStatusMessage(null);
    };

    if (loading) {
        return <div className="loading-message">Ładowanie użytkowników...</div>;
    }

    return (
        <div className="user-management-container">
            <h2>Zarządzanie użytkownikami</h2>

            {statusMessage && (
                <div className={`status-message ${statusMessage.type}`}>
                    {statusMessage.text}
                    <button className="close-btn" onClick={clearStatusMessage}>×</button>
                </div>
            )}

            <div className="user-management-actions">
                <button
                    className="add-user-btn"
                    onClick={() => setShowAddUserForm(!showAddUserForm)}
                >
                    {showAddUserForm ? "Anuluj dodawanie" : "Dodaj użytkownika"}
                </button>
            </div>

            {showAddUserForm && (
                <div className="add-user-form-container">
                    <h3>Dodaj nowego użytkownika</h3>
                    <form className="add-user-form" onSubmit={handleAddUser}>
                        <div className="form-group">
                            <label htmlFor="new-username">Nazwa użytkownika:</label>
                            <input
                                type="text"
                                id="new-username"
                                value={newUser.username}
                                onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="new-email">Email:</label>
                            <input
                                type="email"
                                id="new-email"
                                value={newUser.email}
                                onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="new-password">Hasło:</label>
                            <input
                                type="password"
                                id="new-password"
                                value={newUser.password}
                                onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                                required
                                minLength={6}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="new-role">Rola:</label>
                            <select
                                id="new-role"
                                value={newUser.roleId}
                                onChange={(e) => setNewUser({...newUser, roleId: parseInt(e.target.value)})}
                            >
                                <option value="0">Wybierz rolę</option>
                                {roles.map(role => (
                                    <option key={role.id} value={role.id}>
                                        {role.name} {role.description ? `- ${role.description}` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-actions">
                            <button
                                type="submit"
                                className="save-btn"
                                disabled={newUser.roleId === 0} // Blokuj przycisk jeśli nie wybrano roli
                            >
                                Dodaj
                            </button>
                            <button
                                type="button"
                                className="cancel-btn"
                                onClick={() => setShowAddUserForm(false)}
                            >
                                Anuluj
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {error && <div className="error-message">{error}</div>}

            <div className="users-table-container">
                <table className="users-table">
                    <thead>
                    <tr>
                        <th>ID</th>
                        <th>Nazwa użytkownika</th>
                        <th>Email</th>
                        <th>Rola</th>
                        <th>Akcje</th>
                    </tr>
                    </thead>
                    <tbody>
                    {users.map(user => (
                        <tr key={user.id}>
                            <td>{user.id}</td>
                            <td>
                                {editingUserId === user.id ? (
                                    <input
                                        type="text"
                                        value={editedUser.username}
                                        onChange={(e) => setEditedUser({...editedUser, username: e.target.value})}
                                    />
                                ) : (
                                    user.username
                                )}
                            </td>
                            <td>
                                {editingUserId === user.id ? (
                                    <input
                                        type="email"
                                        value={editedUser.email}
                                        onChange={(e) => setEditedUser({...editedUser, email: e.target.value})}
                                    />
                                ) : (
                                    user.email
                                )}
                            </td>
                            <td>
                                {editingUserId === user.id ? (
                                    <select
                                        value={editedUser.roleId}
                                        onChange={(e) => setEditedUser({...editedUser, roleId: parseInt(e.target.value)})}
                                    >
                                        {roles.map(role => (
                                            <option key={role.id} value={role.id}>
                                                {role.name} {role.description ? `- ${role.description}` : ''}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    /* Wyświetlamy nazwę roli, a opcjonalnie również opis */
                                    <span>
                                        {getRoleName(user.role)}
                                        {user.role.description && <span className="role-description"> - {user.role.description}</span>}
                                    </span>
                                )}
                            </td>
                            <td>
                                {editingUserId === user.id ? (
                                    <>
                                        <div className="edit-password-field">
                                            <label>Nowe hasło (opcjonalnie):</label>
                                            <input
                                                type="password"
                                                value={editedUser.password}
                                                onChange={(e) => setEditedUser({...editedUser, password: e.target.value})}
                                                placeholder="Pozostaw puste, aby nie zmieniać"
                                            />
                                        </div>
                                        <div className="edit-actions">
                                            <button
                                                className="save-btn"
                                                onClick={() => handleUpdateUser(user.id)}
                                            >
                                                Zapisz
                                            </button>
                                            <button
                                                className="cancel-btn"
                                                onClick={handleCancelEdit}
                                            >
                                                Anuluj
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="user-actions">
                                        <button
                                            className="edit-btn"
                                            onClick={() => handleEditUser(user)}
                                        >
                                            Edytuj
                                        </button>
                                        <button
                                            className="delete-btn"
                                            onClick={() => handleDeleteUser(user.id, user.username)}
                                        >
                                            Usuń
                                        </button>
                                    </div>
                                )}
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default UserManagement;