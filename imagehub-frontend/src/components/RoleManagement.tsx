import React, { useState, useEffect } from "react";
import "../styles/RoleManagement.css";
import axiosInstance from "../utils/axiosInstance";

interface Role {
    id: number;
    name: string;
    description: string;
    permissions: string[];
    systemRole: boolean;
}

// Dodanie stałych z opisami uprawnień
const permissionDescriptions: Record<string, string> = {
    files_read: "Odczyt plików i folderów",
    files_write: "Modyfikacja i dodawanie plików do wszystkich folderów",
    files_delete: "Usuwanie plików ze wszystkich folderów",
    files_write_own: "Modyfikacja i dodawanie plików tylko do przypisanych folderów",
    files_delete_own: "Usuwanie plików tylko z przypisanych folderów",
    users_read: "Przeglądanie listy użytkowników",
    users_write: "Dodawanie i edycja użytkowników",
    users_delete: "Usuwanie użytkowników",
    roles_read: "Przeglądanie ról w systemie",
    roles_write: "Tworzenie i edycja ról",
    roles_delete: "Usuwanie ról"
};

// Dodanie grupowania uprawnień
const permissionGroups: Record<string, string[]> = {
    "Pliki i foldery": ["files_read", "files_write", "files_delete", "files_write_own", "files_delete_own"],
    "Użytkownicy": ["users_read", "users_write", "users_delete"],
    "Role": ["roles_read", "roles_write", "roles_delete"]
};

interface Permission {
    id: string;
    name: string;
    description: string;
    category: string;
}

const RoleManagement: React.FC = () => {
    const [roles, setRoles] = useState<Role[]>([]);
    const [availablePermissions, setAvailablePermissions] = useState<Permission[]>([]);
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [editMode, setEditMode] = useState<boolean>(false);
    const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
    const [newRole, setNewRole] = useState<Omit<Role, 'id' | 'systemRole'>>({
        name: '',
        description: '',
        permissions: []
    });
    const [statusMessage, setStatusMessage] = useState<{
        type: 'success' | 'error';
        text: string;
    } | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    // Pobierz role i uprawnienia przy montowaniu komponentu
    useEffect(() => {
        fetchRolesAndPermissions();
    }, []);

    const fetchRolesAndPermissions = async () => {
        setLoading(true);
        try {
            // Pobierz role
            const rolesResponse = await axiosInstance.get('/roles');
            setRoles(rolesResponse.data);

            // Pobierz dostępne uprawnienia
            const permissionsResponse = await axiosInstance.get('/roles/permissions');
            setAvailablePermissions(permissionsResponse.data);

            setStatusMessage(null);
        } catch (err) {
            console.error("Błąd podczas pobierania danych:", err);
            setStatusMessage({
                type: 'error',
                text: "Nie udało się pobrać danych ról i uprawnień."
            });
        } finally {
            setLoading(false);
        }
    };

    // Funkcja do grupowania uprawnień według kategorii z sortowaniem
    const getGroupedPermissions = () => {
        const grouped: Record<string, Permission[]> = {};

        availablePermissions.forEach(permission => {
            if (!grouped[permission.category]) {
                grouped[permission.category] = [];
            }
            grouped[permission.category].push(permission);
        });

        // Sortuj kategorie według permissionGroups (dla zachowania określonej kolejności)
        const sortedGrouped: [string, Permission[]][] = [];
        Object.keys(permissionGroups).forEach(category => {
            if (grouped[category]) {
                sortedGrouped.push([category, grouped[category]]);
            }
        });

        // Dodaj pozostałe kategorie, które nie zostały uwzględnione w permissionGroups
        Object.entries(grouped).forEach(([category, permissions]) => {
            if (!permissionGroups[category]) {
                sortedGrouped.push([category, permissions]);
            }
        });

        return sortedGrouped;
    };

    // Generowanie wyjaśnienia wybranej roli
    const getRoleExplanation = (role: Role): string => {
        const permissionsByCategory = Object.entries(permissionGroups)
            .map(([category, permissionIds]) => {
                const roleHasPermissions = permissionIds.filter(id => role.permissions.includes(id));
                if (roleHasPermissions.length === 0) return null;

                const permissionNames = roleHasPermissions.map(id =>
                    permissionDescriptions[id] || id
                );

                return `${category}: ${permissionNames.join(', ')}`;
            })
            .filter(Boolean);

        return permissionsByCategory.length > 0
            ? permissionsByCategory.join(' | ')
            : 'Brak uprawnień';
    };

    const handleSelectRole = (role: Role) => {
        setSelectedRole(role);
        setEditMode(false);
    };

    const handleEditRole = () => {
        if (!selectedRole) return;
        setEditMode(true);
    };

    const handleUpdateRole = async () => {
        if (!selectedRole) return;

        try {
            const response = await axiosInstance.put(`/roles/${selectedRole.id}`, selectedRole);

            // Aktualizuj listę ról z nowym stanem
            setRoles(prevRoles =>
                prevRoles.map(role =>
                    role.id === selectedRole.id ? response.data : role
                )
            );

            setStatusMessage({
                type: 'success',
                text: `Rola "${selectedRole.name}" została zaktualizowana.`
            });

            setEditMode(false);
        } catch (err: any) {
            console.error("Błąd podczas aktualizacji roli:", err);
            setStatusMessage({
                type: 'error',
                text: err.response?.data || "Nie udało się zaktualizować roli."
            });
        }
    };

    const handleCreateRole = async () => {
        // Validate role name
        if (!newRole.name.trim()) {
            setStatusMessage({
                type: 'error',
                text: "Nazwa roli jest wymagana."
            });
            return;
        }

        try {
            const response = await axiosInstance.post('/roles', {
                ...newRole,
                name: newRole.name.trim().toUpperCase()  // Konwertuj do wielkich liter dla spójności
            });

            // Dodaj nową rolę do listy
            setRoles(prevRoles => [...prevRoles, response.data]);

            setStatusMessage({
                type: 'success',
                text: `Rola "${response.data.name}" została utworzona.`
            });

            // Reset form
            setNewRole({
                name: '',
                description: '',
                permissions: []
            });

            setShowCreateForm(false);
        } catch (err: any) {
            console.error("Błąd podczas tworzenia roli:", err);
            setStatusMessage({
                type: 'error',
                text: err.response?.data || "Nie udało się utworzyć roli."
            });
        }
    };

    const handleDeleteRole = async (roleId: number) => {
        const roleToDelete = roles.find(r => r.id === roleId);
        if (!roleToDelete) return;

        // Nie pozwalaj na usunięcie ról systemowych
        if (roleToDelete.systemRole) {
            setStatusMessage({
                type: 'error',
                text: "Nie można usunąć wbudowanej roli systemowej."
            });
            return;
        }

        if (!window.confirm(`Czy na pewno chcesz usunąć rolę "${roleToDelete.name}"?`)) {
            return;
        }

        try {
            await axiosInstance.delete(`/roles/${roleId}`);

            // Usuń rolę z listy
            setRoles(prevRoles => prevRoles.filter(role => role.id !== roleId));

            if (selectedRole?.id === roleId) {
                setSelectedRole(null);
            }

            setStatusMessage({
                type: 'success',
                text: `Rola "${roleToDelete.name}" została usunięta.`
            });
        } catch (err: any) {
            console.error("Błąd podczas usuwania roli:", err);
            setStatusMessage({
                type: 'error',
                text: err.response?.data || "Nie udało się usunąć roli."
            });
        }
    };

    const handleTogglePermission = (permissionId: string) => {
        if (editMode && selectedRole) {
            const updatedPermissions = selectedRole.permissions.includes(permissionId)
                ? selectedRole.permissions.filter(id => id !== permissionId)
                : [...selectedRole.permissions, permissionId];

            setSelectedRole({
                ...selectedRole,
                permissions: updatedPermissions
            });
        } else if (showCreateForm) {
            const updatedPermissions = newRole.permissions.includes(permissionId)
                ? newRole.permissions.filter(id => id !== permissionId)
                : [...newRole.permissions, permissionId];

            setNewRole({
                ...newRole,
                permissions: updatedPermissions
            });
        }
    };

    // Funkcja do szybkiego wybierania wszystkich uprawnień w grupie
    const togglePermissionGroup = (groupPermissions: string[], target: 'edit' | 'new', checked: boolean) => {
        if (target === 'edit' && selectedRole) {
            let updatedPermissions = [...selectedRole.permissions];

            if (checked) {
                // Dodaj wszystkie uprawnienia z grupy, które jeszcze nie są zaznaczone
                groupPermissions.forEach(permId => {
                    if (!updatedPermissions.includes(permId)) {
                        updatedPermissions.push(permId);
                    }
                });
            } else {
                // Usuń wszystkie uprawnienia z grupy
                updatedPermissions = updatedPermissions.filter(
                    permId => !groupPermissions.includes(permId)
                );
            }

            setSelectedRole({
                ...selectedRole,
                permissions: updatedPermissions
            });
        } else if (target === 'new') {
            let updatedPermissions = [...newRole.permissions];

            if (checked) {
                groupPermissions.forEach(permId => {
                    if (!updatedPermissions.includes(permId)) {
                        updatedPermissions.push(permId);
                    }
                });
            } else {
                updatedPermissions = updatedPermissions.filter(
                    permId => !groupPermissions.includes(permId)
                );
            }

            setNewRole({
                ...newRole,
                permissions: updatedPermissions
            });
        }
    };

    // Sprawdza, czy wszystkie uprawnienia z grupy są wybrane
    const areAllPermissionsInGroupSelected = (groupPermissions: string[], rolePermissions: string[]): boolean => {
        return groupPermissions.every(permId => rolePermissions.includes(permId));
    };

    // Sprawdza, czy jakiekolwiek uprawnienia z grupy są wybrane
    const areSomePermissionsInGroupSelected = (groupPermissions: string[], rolePermissions: string[]): boolean => {
        return groupPermissions.some(permId => rolePermissions.includes(permId));
    };

    const clearStatusMessage = () => {
        setStatusMessage(null);
    };

    return (
        <div className="role-management-container">
            <h2>Zarządzanie rolami</h2>

            {statusMessage && (
                <div className={`status-message ${statusMessage.type}`}>
                    {statusMessage.text}
                    <button className="close-btn" onClick={clearStatusMessage}>×</button>
                </div>
            )}

            {loading && roles.length === 0 ? (
                <div className="loading-message">Ładowanie danych...</div>
            ) : (
                <div className="role-management-content">
                    <div className="roles-list">
                        <div className="roles-header">
                            <h3>Dostępne role</h3>
                            <button
                                className="create-role-btn"
                                onClick={() => {
                                    setShowCreateForm(!showCreateForm);
                                    setSelectedRole(null);
                                    setEditMode(false);
                                }}
                            >
                                {showCreateForm ? "Anuluj" : "Nowa rola"}
                            </button>
                        </div>

                        <ul className="roles-list-items">
                            {roles.map(role => (
                                <li
                                    key={role.id}
                                    className={`role-item ${selectedRole?.id === role.id ? 'selected' : ''}`}
                                    onClick={() => handleSelectRole(role)}
                                >
                                    <div className="role-item-header">
                                        <span className="role-name">{role.name}</span>
                                        <button
                                            className="delete-role-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteRole(role.id);
                                            }}
                                            disabled={role.systemRole}
                                            title={role.systemRole ? "Nie można usunąć roli systemowej" : "Usuń rolę"}
                                        >
                                            ×
                                        </button>
                                    </div>
                                    <div className="role-description">{role.description}</div>
                                    <div className="role-permission-summary">
                                        {getRoleExplanation(role)}
                                    </div>
                                    {role.systemRole && (
                                        <div className="system-role-badge">Rola systemowa</div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="role-details">
                        {showCreateForm ? (
                            <div className="create-role-form">
                                <h3>Nowa rola</h3>

                                <div className="form-group">
                                    <label htmlFor="role-name">Nazwa roli:</label>
                                    <input
                                        type="text"
                                        id="role-name"
                                        value={newRole.name}
                                        onChange={(e) => setNewRole({...newRole, name: e.target.value})}
                                        placeholder="np. MANAGER"
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="role-description">Opis roli:</label>
                                    <textarea
                                        id="role-description"
                                        value={newRole.description}
                                        onChange={(e) => setNewRole({...newRole, description: e.target.value})}
                                        placeholder="Opisz uprawnienia tej roli..."
                                        rows={3}
                                    ></textarea>
                                </div>

                                <h4>Uprawnienia:</h4>

                                <div className="permissions-container">
                                    {Object.entries(permissionGroups).map(([category, permissions]) => (
                                        <div key={category} className="permission-category">
                                            <div className="category-header">
                                                <h5>{category}</h5>
                                                <label className="group-checkbox">
                                                    <input
                                                        type="checkbox"
                                                        checked={areAllPermissionsInGroupSelected(permissions, newRole.permissions)}
                                                        onChange={(e) => togglePermissionGroup(permissions, 'new', e.target.checked)}
                                                        className={areSomePermissionsInGroupSelected(permissions, newRole.permissions) &&
                                                        !areAllPermissionsInGroupSelected(permissions, newRole.permissions) ? "indeterminate" : ""}
                                                    />
                                                    Zaznacz wszystkie
                                                </label>
                                            </div>
                                            <div className="permission-list">
                                                {permissions.map(permId => (
                                                    <div key={permId} className="permission-item">
                                                        <div className="permission-checkbox">
                                                            <input
                                                                type="checkbox"
                                                                id={`new-${permId}`}
                                                                checked={newRole.permissions.includes(permId)}
                                                                onChange={() => handleTogglePermission(permId)}
                                                            />
                                                            <label htmlFor={`new-${permId}`}>
                                                                {permissionDescriptions[permId] || permId}
                                                            </label>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="form-actions">
                                    <button
                                        className="save-btn"
                                        onClick={handleCreateRole}
                                    >
                                        Utwórz rolę
                                    </button>
                                    <button
                                        className="cancel-btn"
                                        onClick={() => setShowCreateForm(false)}
                                    >
                                        Anuluj
                                    </button>
                                </div>
                            </div>
                        ) : selectedRole ? (
                            <div className="role-details-content">
                                <div className="role-details-header">
                                    <h3>{selectedRole.name}</h3>
                                    {!editMode ? (
                                        <button
                                            className="edit-btn"
                                            onClick={handleEditRole}
                                            disabled={selectedRole.systemRole && selectedRole.name !== 'ADMIN'} // Nie pozwalaj na edycję ról systemowych oprócz ADMIN
                                            title={selectedRole.systemRole && selectedRole.name !== 'ADMIN' ? "Nie można edytować tej roli systemowej" : "Edytuj rolę"}
                                        >
                                            Edytuj
                                        </button>
                                    ) : (
                                        <div className="edit-actions">
                                            <button
                                                className="save-btn"
                                                onClick={handleUpdateRole}
                                            >
                                                Zapisz
                                            </button>
                                            <button
                                                className="cancel-btn"
                                                onClick={() => setEditMode(false)}
                                            >
                                                Anuluj
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {selectedRole.systemRole && (
                                    <div className="system-role-badge detail-badge">Rola systemowa</div>
                                )}

                                <div className="role-description-section">
                                    <h4>Opis:</h4>
                                    {editMode ? (
                                        <textarea
                                            value={selectedRole.description}
                                            onChange={(e) => setSelectedRole({
                                                ...selectedRole,
                                                description: e.target.value
                                            })}
                                            rows={3}
                                        ></textarea>
                                    ) : (
                                        <p>{selectedRole.description || "Brak opisu"}</p>
                                    )}
                                </div>

                                <div className="role-permissions">
                                    <h4>Uprawnienia:</h4>

                                    <div className="permissions-container">
                                        {Object.entries(permissionGroups).map(([category, permissions]) => (
                                            <div key={category} className="permission-category">
                                                <div className="category-header">
                                                    <h5>{category}</h5>
                                                    {editMode && (
                                                        <label className="group-checkbox">
                                                            <input
                                                                type="checkbox"
                                                                checked={areAllPermissionsInGroupSelected(permissions, selectedRole.permissions)}
                                                                onChange={(e) => togglePermissionGroup(permissions, 'edit', e.target.checked)}
                                                                className={areSomePermissionsInGroupSelected(permissions, selectedRole.permissions) &&
                                                                !areAllPermissionsInGroupSelected(permissions, selectedRole.permissions) ? "indeterminate" : ""}
                                                            />
                                                            Zaznacz wszystkie
                                                        </label>
                                                    )}
                                                </div>
                                                <div className="permission-list">
                                                    {permissions.map(permId => (
                                                        <div key={permId} className="permission-item">
                                                            <div className="permission-checkbox">
                                                                <input
                                                                    type="checkbox"
                                                                    id={permId}
                                                                    checked={selectedRole.permissions.includes(permId)}
                                                                    onChange={() => editMode && handleTogglePermission(permId)}
                                                                    disabled={!editMode}
                                                                />
                                                                <label htmlFor={permId} className={!editMode ? "disabled" : ""}>
                                                                    {permissionDescriptions[permId] || permId}
                                                                </label>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="no-role-selected">
                                <p>Wybierz rolę z listy lub utwórz nową.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default RoleManagement;