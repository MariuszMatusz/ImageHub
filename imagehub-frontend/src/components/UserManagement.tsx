import React, { useEffect, useState } from "react";
import axiosInstance from "../utils/axiosInstance";
import "../styles/UserManagement.css";

interface User {
    id: number;
    username: string;
    email: string;
    role: string;
}

interface NewUser {
    username: string;
    email: string;
    password: string;
    role: string;
}

const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
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
        role: string;
        password: string;
    }>({
        username: '',
        email: '',
        role: 'USER',
        password: ''
    });

    // New user state
    const [showAddUserForm, setShowAddUserForm] = useState<boolean>(false);
    const [newUser, setNewUser] = useState<NewUser>({
        username: '',
        email: '',
        password: '',
        role: 'USER'
    });

    // Load users on component mount
    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await axiosInstance.get("/users");
            setUsers(response.data);
            setError(null);
        } catch (err) {
            setError("Nie udało się pobrać listy użytkowników.");
            console.error("Error fetching users:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleEditUser = (user: User) => {
        setEditingUserId(user.id);
        setEditedUser({
            username: user.username,
            email: user.email,
            role: user.role,
            password: '' // Password field is empty when editing
        });
    };

    const handleCancelEdit = () => {
        setEditingUserId(null);
    };

    const handleUpdateUser = async (id: number) => {
        try {
            await axiosInstance.put(`/users/${id}`, editedUser);
            setStatusMessage({
                type: 'success',
                text: `Użytkownik ${editedUser.username} został zaktualizowany.`
            });
            setEditingUserId(null);
            fetchUsers(); // Refresh the user list
        } catch (err) {
            setStatusMessage({
                type: 'error',
                text: "Nie udało się zaktualizować użytkownika."
            });
            console.error("Error updating user:", err);
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
        } catch (err) {
            setStatusMessage({
                type: 'error',
                text: "Nie udało się usunąć użytkownika."
            });
            console.error("Error deleting user:", err);
        }
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate form
        if (!newUser.username || !newUser.email || !newUser.password) {
            setStatusMessage({
                type: 'error',
                text: "Wszystkie pola są wymagane."
            });
            return;
        }

        try {
            await axiosInstance.post("/users", newUser);
            setStatusMessage({
                type: 'success',
                text: `Użytkownik ${newUser.username} został dodany.`
            });
            setShowAddUserForm(false);
            setNewUser({
                username: '',
                email: '',
                password: '',
                role: 'USER'
            });
            fetchUsers(); // Refresh the user list
        } catch (err) {
            setStatusMessage({
                type: 'error',
                text: "Nie udało się dodać użytkownika."
            });
            console.error("Error adding user:", err);
        }
    };

    const clearStatusMessage = () => {
        setStatusMessage(null);
    };

    if (loading && users.length === 0) {
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
                                value={newUser.role}
                                onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                            >
                                <option value="USER">Użytkownik</option>
                                <option value="ADMIN">Administrator</option>
                            </select>
                        </div>

                        <div className="form-actions">
                            <button type="submit" className="save-btn">Dodaj</button>
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
                                        value={editedUser.role}
                                        onChange={(e) => setEditedUser({...editedUser, role: e.target.value})}
                                    >
                                        <option value="USER">Użytkownik</option>
                                        <option value="ADMIN">Administrator</option>
                                    </select>
                                ) : (
                                    user.role
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