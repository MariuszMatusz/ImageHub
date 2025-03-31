// src/contexts/PermissionContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import axiosInstance from '../utils/axiosInstance';

// Definicje typów
interface FolderPermission {
    canRead: boolean;
    canWrite: boolean;
    canDelete: boolean;
    canDownload: boolean; // Dodane pole dla uprawnienia pobierania
    includeSubfolders: boolean;
}

interface Permissions {
    rolePermissions: string[];
    folderPermissions: Record<string, FolderPermission>;
    isAdmin: boolean;
    isLoading: boolean;
    error: string | null;
}

// Kontekst z funkcjami pomocniczymi
export const PermissionContext = createContext<{
    permissions: Permissions;
    hasPermission: (permission: string) => boolean;
    canReadFolder: (folderPath: string) => boolean;
    canWriteFolder: (folderPath: string) => boolean;
    canDeleteFolder: (folderPath: string) => boolean;
    canDownloadFolder: (folderPath: string) => boolean; // Dodana nowa funkcja
}>({
    permissions: {
        rolePermissions: [],
        folderPermissions: {},
        isAdmin: false,
        isLoading: true,
        error: null
    },
    hasPermission: () => false,
    canReadFolder: () => false,
    canWriteFolder: () => false,
    canDeleteFolder: () => false,
    canDownloadFolder: () => false // Dodana funkcja z domyślną wartością
});

export const usePermissions = () => useContext(PermissionContext);

export const PermissionProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
    // Stan uprawnień
    const [permissions, setPermissions] = useState<Permissions>({
        rolePermissions: [],
        folderPermissions: {},
        isAdmin: false,
        isLoading: true,
        error: null
    });

    // Wczytaj uprawnienia przy montowaniu komponentu
    useEffect(() => {
        let mounted = true;
    //     const fetchPermissions = async () => {
    //         try {
    //             const response = await axiosInstance.get('/users/me/permissions');
    //
    //             // Logowanie dla debugowania
    //             console.log('Pobrane uprawnienia z API:', response.data);
    //
    //             setPermissions({
    //                 ...response.data,
    //                 isLoading: false,
    //                 error: null
    //             });
    //         } catch (error) {
    //             console.error('Błąd pobierania uprawnień:', error);
    //             setPermissions(prev => ({
    //                 ...prev,
    //                 isLoading: false,
    //                 error: 'Nie udało się załadować uprawnień'
    //             }));
    //         }
    //     };
    //
    //     fetchPermissions();
    // }, []);

        const fetchPermissions = async () => {
            try {
                console.log('Starting permission fetch');
                const response = await axiosInstance.get('/users/me/permissions');

                // Only update state if component is still mounted
                if (mounted) {
                    console.log('Fetched permissions:', response.data);

                    // Make sure we have at least empty arrays/objects for all properties
                    setPermissions({
                        rolePermissions: response.data.rolePermissions || [],
                        folderPermissions: response.data.folderPermissions || {},
                        isAdmin: response.data.isAdmin || false,
                        isLoading: false,
                        error: null
                    });

                    console.log('Permission loading complete');
                }
            } catch (error) {
                console.error('Error fetching permissions:', error);
                if (mounted) {
                    setPermissions(prev => ({
                        ...prev,
                        isLoading: false,
                        error: 'Failed to load permissions'
                    }));
                }
            }
        };

        fetchPermissions();

        // Cleanup function
        return () => {
            mounted = false;
        };
    }, []);

    // Funkcje pomocnicze do sprawdzania uprawnień
    const hasPermission = (permission: string): boolean => {
        if (permissions.isAdmin) return true;
        return permissions.rolePermissions.includes(permission);
    };

    const canReadFolder = (folderPath: string): boolean => {
        if (permissions.isAdmin) return true;

        // Jeśli ma globalne uprawnienie files_read, ma dostęp do wszystkich folderów
        if (hasPermission('files_read')) return true;

        // W przeciwnym razie sprawdź konkretne uprawnienia
        for (const [path, perms] of Object.entries(permissions.folderPermissions)) {
            if (folderPath.startsWith(path) && perms.canRead) {
                if (path === folderPath || perms.includeSubfolders) {
                    return true;
                }
            }
        }

        return false;
    };

    const canWriteFolder = (folderPath: string): boolean => {
        if (permissions.isAdmin) return true;

        // Jeśli ma globalne uprawnienie files_write, ma dostęp do zapisu wszystkich folderów
        if (hasPermission('files_write')) return true;

        // Sprawdź uprawnienie do zapisu własnych folderów
        if (hasPermission('files_write_own')) {
            // Sprawdź czy to jest folder, do którego ma konkretne uprawnienia
            for (const [path, perms] of Object.entries(permissions.folderPermissions)) {
                if (folderPath.startsWith(path) && perms.canWrite) {
                    if (path === folderPath || perms.includeSubfolders) {
                        return true;
                    }
                }
            }
        }

        return false;
    };

    const canDeleteFolder = (folderPath: string): boolean => {
        if (permissions.isAdmin) return true;

        // Jeśli ma globalne uprawnienie files_delete, może usuwać we wszystkich folderach
        if (hasPermission('files_delete')) return true;

        // Sprawdź uprawnienie do usuwania własnych folderów
        if (hasPermission('files_delete_own')) {
            // Sprawdź czy to jest folder, do którego ma konkretne uprawnienia
            for (const [path, perms] of Object.entries(permissions.folderPermissions)) {
                if (folderPath.startsWith(path) && perms.canDelete) {
                    if (path === folderPath || perms.includeSubfolders) {
                        return true;
                    }
                }
            }
        }

        return false;
    };

    // // Nowa funkcja sprawdzająca uprawnienia do pobierania
    // const canDownloadFolder = (folderPath: string): boolean => {
    //
    //
    //
    //     // Admin zawsze ma uprawnienia
    //     if (permissions.isAdmin) return true;
    //
    //     // Jeśli uprawnienia są jeszcze ładowane, załóż, że nie ma uprawnień
    //     if (permissions.isLoading) {
    //         console.log('Uprawnienia jeszcze się ładują, zwracam false');
    //         return false;
    //     }
    //
    //     console.log(`Sprawdzanie uprawnień pobierania dla: ${folderPath}`);
    //     console.log(`Stan uprawnień:`, permissions);
    //
    //     // Globalne uprawnienie do pobierania
    //     if (hasPermission('files_download')) return true;
    //
    //     // Sprawdź uprawnienia dla konkretnych folderów
    //     const folderPermissionsEntries = Object.entries(permissions.folderPermissions);
    //
    //     // Jeśli ma uprawnienie do odczytu, sprawdź czy nie ma jawnego zakazu pobierania
    //     if (hasPermission('files_read')) {
    //         // Sprawdź czy istnieje jawne wyłączenie pobierania dla tego folderu
    //         for (let i = 0; i < folderPermissionsEntries.length; i++) {
    //             const [path, perm] = folderPermissionsEntries[i];
    //
    //             if (folderPath.startsWith(path) && (path === folderPath || perm.includeSubfolders)) {
    //                 // Jeśli jawnie wyłączono pobieranie
    //                 if (perm.canDownload === false) {
    //                     return false;
    //                 }
    //             }
    //         }
    //
    //         // Domyślnie pozwól na pobieranie, jeśli jest uprawnienie do odczytu
    //         return true;
    //     }
    //
    //     // Sprawdź szczegółowe uprawnienia, jeśli nie ma globalnych
    //     for (let i = 0; i < folderPermissionsEntries.length; i++) {
    //         const [path, perm] = folderPermissionsEntries[i];
    //
    //         if (folderPath.startsWith(path)) {
    //             // Użyj uprawnienia do pobierania lub domyślnie uprawnienia do odczytu
    //             const hasDownloadPermission =
    //                 perm.canDownload !== undefined ? perm.canDownload : perm.canRead;
    //
    //             if (hasDownloadPermission && (path === folderPath || perm.includeSubfolders)) {
    //                 return true;
    //             }
    //         }
    //     }
    //
    //     return false;
    // };
    const canDownloadFolder = (folderPath: string): boolean => {
        // If permissions are still loading, log and return false
        if (permissions.isLoading) {
            console.log(`Permissions still loading when checking download for path: ${folderPath}`);
            return false;
        }

        // Admin always has permissions
        if (permissions.isAdmin) return true;

        console.log(`Checking download permissions for: ${folderPath}`);

        // Global download permission
        if (hasPermission('files_download')) {
            console.log('User has global download permission');
            return true;
        }

        // Check specific folder permissions
        const folderPermissionsEntries = Object.entries(permissions.folderPermissions);
        console.log(`Number of folder permission entries: ${folderPermissionsEntries.length}`);

        // If user has read permission, check if there's an explicit denial of download
        if (hasPermission('files_read')) {
            // Check if download is explicitly disabled for this folder
            for (let i = 0; i < folderPermissionsEntries.length; i++) {
                const [path, perm] = folderPermissionsEntries[i];

                if (folderPath.startsWith(path) && (path === folderPath || perm.includeSubfolders)) {
                    // If download is explicitly disabled
                    if (perm.canDownload === false) {
                        console.log(`Download explicitly disabled for ${path}`);
                        return false;
                    }
                }
            }

            // Default to allowing download if read permission exists
            console.log(`Default allowing download due to read permission for ${folderPath}`);
            return true;
        }

        // Check detailed permissions if no global permissions exist
        for (let i = 0; i < folderPermissionsEntries.length; i++) {
            const [path, perm] = folderPermissionsEntries[i];

            if (folderPath.startsWith(path)) {
                // Use download permission or default to read permission
                const hasDownloadPermission =
                    perm.canDownload !== undefined ? perm.canDownload : perm.canRead;

                if (hasDownloadPermission && (path === folderPath || perm.includeSubfolders)) {
                    console.log(`Found explicit download permission for ${path}`);
                    return true;
                }
            }
        }

        console.log(`No download permission found for ${folderPath}`);
        return false;
    };
    return (
        <PermissionContext.Provider value={{
            permissions,
            hasPermission,
            canReadFolder,
            canWriteFolder,
            canDeleteFolder,
            canDownloadFolder  // Dodano funkcję do kontekstu
        }}>
            {children}
        </PermissionContext.Provider>
    );
};