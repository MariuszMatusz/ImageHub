package com.imagehub.imagehub.model;

import jakarta.persistence.*;

@Entity
@Table(
        name = "folder_permissions",
        uniqueConstraints = {
                @UniqueConstraint(columnNames = {"folder_id", "user_id"})
        }
)
public class FolderPermission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Folder, do którego odnosi się dane uprawnienie.
     */
    @ManyToOne
    @JoinColumn(name = "folder_id", nullable = false)
    private Folder folder;

    /**
     * Użytkownik, któremu przypisano dane uprawnienie.
     */
    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /**
     * Typ uprawnienia, np. READ, WRITE, ADMIN itp.
     * Możesz też użyć enuma (FolderPermissionType) zamiast String.
     */
    @Column(nullable = false)
    private String permissionType;

    // ----------------------------------------
    // Konstruktory
    // ----------------------------------------
    public FolderPermission() {
    }

    public FolderPermission(Folder folder, User user, String permissionType) {
        this.folder = folder;
        this.user = user;
        this.permissionType = permissionType;
    }

    // ----------------------------------------
    // Gettery / Settery
    // ----------------------------------------
    public Long getId() {
        return id;
    }

    public Folder getFolder() {
        return folder;
    }

    public User getUser() {
        return user;
    }

    public String getPermissionType() {
        return permissionType;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public void setFolder(Folder folder) {
        this.folder = folder;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public void setPermissionType(String permissionType) {
        this.permissionType = permissionType;
    }
}
