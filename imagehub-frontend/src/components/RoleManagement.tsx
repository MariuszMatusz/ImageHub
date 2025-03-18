import React, { useState } from "react";
import "../styles/RoleManagement.css";

// Since the backend currently doesn't have a dedicated API for managing custom roles
// this is a mock implementation that shows the UI for creating and managing roles
// In a real implementation, this would connect to backend APIs

interface Role {
    id: number;
    name: string;
    description: string;
    permissions: string[];
}

interface Permission {
    id: string;
    name: string;
    description: string;
    category: string;
}

const RoleManagement: React.FC = () => {
    // Mock data for roles
    const [roles, setRoles] = useState<Role[]>([
        {
            id: 1,
            name: 'ADMIN',
            description: 'Pełny dostęp do wszystkich funkcji systemu',
            permissions: ['files_read', 'files_write', 'files_delete', 'users_read', 'users_write', 'users_delete']
        },
        {
            id: 2,
            name: 'USER',
            description: 'Podstawowy dostęp do plików zgodnie z uprawnieniami folderów',
            permissions: ['files_read', 'files_write_own', 'files_delete_own']
        }
    ]);

    // Mock data for available permissions
    const availablePermissions: Permission[] = [
        { id: 'files_read', name: 'Odczyt plików', description: 'Możliwość przeglądania plików', category: 'Pliki' },
        { id: 'files_write', name: 'Zapis plików', description: 'Możliwość dodawania i modyfikowania plików', category: 'Pliki' },
        { id: 'files_write_own', name: 'Zapis własnych plików', description: 'Możliwość dodawania i modyfikowania tylko własnych plików', category: 'Pliki' },
        { id: 'files_delete', name: 'Usuwanie plików', description: 'Możliwość usuwania plików', category: 'Pliki' },
        { id: 'files_delete_own', name: 'Usuwanie własnych plików', description: 'Możliwość usuwania tylko własnych plików', category: 'Pliki' },
        { id: 'users_read', name: 'Odczyt użytkowników', description: 'Możliwość przeglądania listy użytkowników', category: 'Użytkownicy' },
        { id: 'users_write', name: 'Edycja użytkowników', description: 'Możliwość dodawania i modyfikowania użytkowników', category: 'Użytkownicy' },
        { id: 'users_delete', name: 'Usuwanie użytkowników', description: 'Możliwość usuwania użytkowników', category: 'Użytkownicy' },
        { id: 'roles_read', name: 'Odczyt ról', description: 'Możliwość przeglądania ról', category: 'Role' },
        { id: 'roles_write', name: 'Edycja ról', description: 'Możliwość dodawania i modyfikowania ról', category: 'Role' },
        { id: 'roles_delete', name: 'Usuwanie ról', description: 'Możliwość usuwania ról', category: 'Role' }
    ];

    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [editMode, setEditMode] = useState<boolean>(false);
    const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
    const [newRole, setNewRole] = useState<Omit<Role, 'id'>>({
        name: '',
        description: '',
        permissions: []
    });
    const [statusMessage, setStatusMessage] = useState<{
        type: 'success' | 'error';
        text: string;
    } | null>(null);

    // Group permissions by category for display
    const groupedPermissions = availablePermissions.reduce((acc, permission) => {
        if (!acc[permission.category]) {
            acc[permission.category] = [];
        }
        acc[permission.category].push(permission);
        return acc;
    }, {} as Record<string, Permission[]>);

    const handleSelectRole = (role: Role) => {
        setSelectedRole(role);
        setEditMode(false);
    };

    const handleEditRole = () => {
        if (!selectedRole) return;
        setEditMode(true);
    };

    const handleUpdateRole = () => {
        if (!selectedRole) return;

        setRoles(prevRoles =>
            prevRoles.map(role =>
                role.id === selectedRole.id ? selectedRole : role
            )
        );

        setStatusMessage({
            type: 'success',
            text: `Rola "${selectedRole.name}" została zaktualizowana.`
        });

        setEditMode(false);
    };

    const handleCreateRole = () => {
        // Validate role name
        if (!newRole.name.trim()) {
            setStatusMessage({
                type: 'error',
                text: "Nazwa roli jest wymagana."
            });
            return;
        }

        // Check if role name already exists
        if (roles.some(r => r.name.toLowerCase() === newRole.name.trim().toLowerCase())) {
            setStatusMessage({
                type: 'error',
                text: "Rola o tej nazwie już istnieje."
            });
            return;
        }

        // Add new role with a generated ID
        const newRoleWithId: Role = {
            ...newRole,
            id: Math.max(...roles.map(r => r.id), 0) + 1,
            name: newRole.name.trim().toUpperCase() // Convert to uppercase for consistency
        };

        setRoles(prevRoles => [...prevRoles, newRoleWithId]);

        setStatusMessage({
            type: 'success',
            text: `Rola "${newRoleWithId.name}" została utworzona.`
        });

        // Reset form
        setNewRole({
            name: '',
            description: '',
            permissions: []
        });

        setShowCreateForm(false);
    };

    const handleDeleteRole = (roleId: number) => {
        const roleToDelete = roles.find(r => r.id === roleId);
        if (!roleToDelete) return;

        // Don't allow deleting built-in roles
        if (['ADMIN', 'USER'].includes(roleToDelete.name)) {
            setStatusMessage({
                type: 'error',
                text: "Nie można usunąć wbudowanej roli systemowej."
            });
            return;
        }

        if (!window.confirm(`Czy na pewno chcesz usunąć rolę "${roleToDelete.name}"?`)) {
            return;
        }

        setRoles(prevRoles => prevRoles.filter(role => role.id !== roleId));

        if (selectedRole?.id === roleId) {
            setSelectedRole(null);
        }

        setStatusMessage({
            type: 'success',
            text: `Rola "${roleToDelete.name}" została usunięta.`
        });
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
                                    >
                                        ×
                                    </button>
                                </div>
                                <div className="role-description">{role.description}</div>
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
                                {Object.entries(groupedPermissions).map(([category, permissions]) => (
                                    <div key={category} className="permission-category">
                                        <h5>{category}</h5>
                                        <ul className="permission-list">
                                            {permissions.map(permission => (
                                                <li key={permission.id} className="permission-item">
                                                    <div className="permission-checkbox">
                                                        <input
                                                            type="checkbox"
                                                            id={`new-${permission.id}`}
                                                            checked={newRole.permissions.includes(permission.id)}
                                                            onChange={() => handleTogglePermission(permission.id)}
                                                        />
                                                        <label htmlFor={`new-${permission.id}`}>
                                                            {permission.name}
                                                        </label>
                                                    </div>
                                                    <span className="permission-description">
                                                        {permission.description}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
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
                                    <p>{selectedRole.description}</p>
                                )}
                            </div>

                            <div className="role-permissions">
                                <h4>Uprawnienia:</h4>

                                <div className="permissions-container">
                                    {Object.entries(groupedPermissions).map(([category, permissions]) => (
                                        <div key={category} className="permission-category">
                                            <h5>{category}</h5>
                                            <ul className="permission-list">
                                                {permissions.map(permission => (
                                                    <li key={permission.id} className="permission-item">
                                                        <div className="permission-checkbox">
                                                            <input
                                                                type="checkbox"
                                                                id={permission.id}
                                                                checked={selectedRole.permissions.includes(permission.id)}
                                                                onChange={() => editMode && handleTogglePermission(permission.id)}
                                                                disabled={!editMode}
                                                            />
                                                            <label htmlFor={permission.id}>
                                                                {permission.name}
                                                            </label>
                                                        </div>
                                                        <span className="permission-description">
                                                            {permission.description}
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
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
        </div>
    );
};

export default RoleManagement;