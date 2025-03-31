package com.imagehub.imagehub.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@Entity
@Table(name = "folder_permissions",
        uniqueConstraints = @UniqueConstraint(columnNames = {"folder_path", "user_id"}))
public class FolderPermission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Folder path cannot be blank")
    @Column(name = "folder_path", nullable = false)
    private String folderPath;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false)
    @NotNull(message = "User cannot be null")
    private User user;

    @Column(name = "can_read", nullable = false)
    private boolean canRead = true;

    @Column(name = "can_write", nullable = false)
    private boolean canWrite = false;

    @Column(name = "can_delete", nullable = false)
    private boolean canDelete = false;

    @Column(name = "can_download", nullable = false)
    private boolean canDownload = true;

    @Column(name = "include_subfolders", nullable = false)
    private boolean includeSubfolders = false;

    // Dodane nowe pole permission_type wymagane przez bazę danych
    @Column(name = "permission_type", nullable = false)
    private String permissionType = "STANDARD";

    // Konstruktor domyślny
    public FolderPermission() {
    }

    // Konstruktor z parametrami - dla kompatybilności ze starym kodem
    public FolderPermission(String folderPath, User user, boolean canRead, boolean canWrite,
                            boolean canDelete, boolean includeSubfolders) {
        this.folderPath = folderPath;
        this.user = user;
        this.canRead = canRead;
        this.canWrite = canWrite;
        this.canDelete = canDelete;
        this.canDownload = canRead; // domyślnie canDownload = canRead
        this.includeSubfolders = includeSubfolders;
        this.permissionType = "STANDARD"; // Ustawienie domyślnej wartości
    }

    // Dodatkowy konstruktor z parametrem permission_type
    public FolderPermission(String folderPath, User user, boolean canRead, boolean canWrite,
                            boolean canDelete, boolean includeSubfolders, String permissionType) {
        this.folderPath = folderPath;
        this.user = user;
        this.canRead = canRead;
        this.canWrite = canWrite;
        this.canDelete = canDelete;
        this.canDownload = canRead; // domyślnie canDownload = canRead
        this.includeSubfolders = includeSubfolders;
        this.permissionType = permissionType;
    }

    // Nowy konstruktor z parametrami - z canDownload
    public FolderPermission(String folderPath, User user, boolean canRead, boolean canWrite,
                            boolean canDelete, boolean canDownload, boolean includeSubfolders) {
        this.folderPath = folderPath;
        this.user = user;
        this.canRead = canRead;
        this.canWrite = canWrite;
        this.canDelete = canDelete;
        this.canDownload = canDownload;
        this.includeSubfolders = includeSubfolders;
        this.permissionType = "STANDARD";
    }

    // Pełny konstruktor z wszystkimi parametrami
    public FolderPermission(String folderPath, User user, boolean canRead, boolean canWrite,
                            boolean canDelete, boolean canDownload, boolean includeSubfolders, String permissionType) {
        this.folderPath = folderPath;
        this.user = user;
        this.canRead = canRead;
        this.canWrite = canWrite;
        this.canDelete = canDelete;
        this.canDownload = canDownload;
        this.includeSubfolders = includeSubfolders;
        this.permissionType = permissionType;
    }

    // Gettery i settery
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getFolderPath() {
        return folderPath;
    }

    public void setFolderPath(String folderPath) {
        this.folderPath = folderPath;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public boolean isCanRead() {
        return canRead;
    }

    public void setCanRead(boolean canRead) {
        this.canRead = canRead;
    }

    public boolean isCanWrite() {
        return canWrite;
    }

    public void setCanWrite(boolean canWrite) {
        this.canWrite = canWrite;
    }

    public boolean isCanDelete() {
        return canDelete;
    }

    public void setCanDelete(boolean canDelete) {
        this.canDelete = canDelete;
    }

    public boolean isCanDownload() {
        return canDownload;
    }

    public void setCanDownload(boolean canDownload) {
        this.canDownload = canDownload;
    }

    public boolean isIncludeSubfolders() {
        return includeSubfolders;
    }

    public void setIncludeSubfolders(boolean includeSubfolders) {
        this.includeSubfolders = includeSubfolders;
    }

    public String getPermissionType() {
        return permissionType;
    }

    public void setPermissionType(String permissionType) {
        this.permissionType = permissionType;
    }

    // Stałe dla typów uprawnień
    public static final String PERMISSION_TYPE_STANDARD = "STANDARD";
    public static final String PERMISSION_TYPE_PRODUCT = "PRODUCT";
    public static final String PERMISSION_TYPE_CHILDREN_AS_PRODUCTS = "CHILDREN_AS_PRODUCTS"; // Nowy typ
}