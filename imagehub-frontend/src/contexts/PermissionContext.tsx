import React, { createContext, useContext, useState, useEffect } from 'react';
import axiosInstance from '../utils/axiosInstance';

// Definicje typów
interface FolderPermission {
    canRead: boolean;
    canWrite: boolean;
    canDelete: boolean;
    canDownload: boolean;
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
    canDownloadFolder: (folderPath: string) => boolean;
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
    canDownloadFolder: () => false
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


        const fetchPermissions = async () => {
            try {
                console.log('Starting permission fetch');
                const response = await axiosInstance.get('/users/me/permissions');

                // Aktualizuj stan tylko wtedy, gdy komponent jest nadal zamontowany
                if (mounted) {
                    console.log('Fetched permissions:', response.data);

                    // Sprawdzenie, czy mamy puste tablice/obiekty
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

        // Funkcja czyszczenia
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


    const canDownloadFolder = (folderPath: string): boolean => {
        // Jeśli uprawnienia nadal się ładują, zaloguj się i zwróć false
        if (permissions.isLoading) {
            console.log(`Permissions still loading when checking download for path: ${folderPath}`);
            return false;
        }

        // Admin zawsze ma uprawnienia
        if (permissions.isAdmin) return true;

        console.log(`Checking download permissions for: ${folderPath}`);

        // Globalne pozwolenie na pobieranie
        if (hasPermission('files_download')) {
            console.log('User has global download permission');
            return true;
        }

        // Sprawdź uprawnienia do konkretnego folderu
        const folderPermissionsEntries = Object.entries(permissions.folderPermissions);
        console.log(`Number of folder permission entries: ${folderPermissionsEntries.length}`);

        // Jeśli użytkownik ma uprawnienia do odczytu, sprawdź, czy nie ma zakazu pobierania
        if (hasPermission('files_read')) {
            // Sprawdź, czy pobieranie jest wyłączone dla tego folderu
            for (let i = 0; i < folderPermissionsEntries.length; i++) {
                const [path, perm] = folderPermissionsEntries[i];

                if (folderPath.startsWith(path) && (path === folderPath || perm.includeSubfolders)) {
                    // Jeśli pobieranie jest wyłączone
                    if (perm.canDownload === false) {
                        console.log(`Download explicitly disabled for ${path}`);
                        return false;
                    }
                }
            }

            // Domyślnie zezwalaj na pobieranie, jeśli istnieją uprawnienia do odczytu
            console.log(`Default allowing download due to read permission for ${folderPath}`);
            return true;
        }

        // Sprawdź szczegółowe uprawnienia, jeśli nie istnieją żadne uprawnienia globalne
        for (let i = 0; i < folderPermissionsEntries.length; i++) {
            const [path, perm] = folderPermissionsEntries[i];

            if (folderPath.startsWith(path)) {
                // Użyj uprawnień do pobierania lub domyślnie ustaw uprawnienia do odczytu
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
            canDownloadFolder
        }}>
            {children}
        </PermissionContext.Provider>
    );
};