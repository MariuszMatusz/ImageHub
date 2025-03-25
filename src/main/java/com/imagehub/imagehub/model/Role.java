package com.imagehub.imagehub.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "roles")
public class Role {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Nazwa roli nie może być pusta")
    @Size(min = 2, max = 50, message = "Nazwa roli musi mieć od 2 do 50 znaków")
    @Column(nullable = false, unique = true)
    private String name;

    @Column(length = 500)
    private String description;

    // Lista uprawnień przypisanych do roli
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "role_permissions", joinColumns = @JoinColumn(name = "role_id"))
    @Column(name = "permission")
    private Set<String> permissions = new HashSet<>();

    // Flaga określająca, czy jest to rola systemowa (predefiniowana, której nie można usunąć)
    @Column(nullable = false)
    private boolean systemRole = false;

    // Konstruktor bezargumentowy
    public Role() {
    }

    // Konstruktor z argumentami
    public Role(String name, String description, Set<String> permissions, boolean systemRole) {
        this.name = name;
        this.description = description;
        this.permissions = permissions;
        this.systemRole = systemRole;
    }

    // Gettery i settery
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Set<String> getPermissions() {
        return permissions;
    }

    public void setPermissions(Set<String> permissions) {
        this.permissions = permissions;
    }

    public boolean isSystemRole() {
        return systemRole;
    }

    public void setSystemRole(boolean systemRole) {
        this.systemRole = systemRole;
    }

    // Metoda pomocnicza do sprawdzania, czy rola ma dane uprawnienie
    public boolean hasPermission(String permission) {
        return permissions.contains(permission);
    }
}