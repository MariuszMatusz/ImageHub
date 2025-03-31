package com.imagehub.imagehub.model;

public class PermissionConstants {
    // Uprawnienia do plików
    public static final String FILES_READ = "files_read";
    public static final String FILES_WRITE = "files_write";
    public static final String FILES_DELETE = "files_delete";
    public static final String FILES_WRITE_OWN = "files_write_own";
    public static final String FILES_DELETE_OWN = "files_delete_own";
    public static final String FILES_DOWNLOAD = "files_download"; // Nowe uprawnienie

    // Uprawnienia do użytkowników
    public static final String USERS_READ = "users_read";
    public static final String USERS_WRITE = "users_write";
    public static final String USERS_DELETE = "users_delete";

    // Uprawnienia do ról
    public static final String ROLES_READ = "roles_read";
    public static final String ROLES_WRITE = "roles_write";
    public static final String ROLES_DELETE = "roles_delete";

    // Grupy uprawnień
    public static final String[] ALL_FILES_PERMISSIONS = {
            FILES_READ, FILES_WRITE, FILES_DELETE, FILES_DOWNLOAD
    };

    public static final String[] OWN_FILES_PERMISSIONS = {
            FILES_READ, FILES_WRITE_OWN, FILES_DELETE_OWN, FILES_DOWNLOAD
    };
}