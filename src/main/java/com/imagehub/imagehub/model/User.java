package com.imagehub.imagehub.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Entity
@Table(name = "users", uniqueConstraints = {
        @UniqueConstraint(columnNames = "username"),
        @UniqueConstraint(columnNames = "email")
})

public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Username cannot be blank") // Pole nie może być puste
    @Size(min = 3, max = 20, message = "Username must be between 3 and 20 characters") // Długość od 3 do 20 znaków
    @Column(nullable = false, unique = true) // Ograniczenie na poziomie bazy danych
    private String username;

    @NotBlank(message = "Password cannot be blank")
    @Size(min = 6, message = "Password must be at least 6 characters long") // Minimalna długość hasła
    private String password;

    @Email(message = "Email should be valid") // Walidacja poprawnego adresu email
    @NotBlank(message = "Email cannot be blank")
    @Column(nullable = false, unique = true) // Ograniczenie na poziomie bazy danych
    private String email;

    @NotBlank(message = "Role cannot be blank") // Pole nie może być puste
    private String role; // np. "ADMIN", "USER"

    // Konstruktor bezargumentowy
    public User() {}

    // Konstruktor z argumentami
    public User(Long id, String username, String password, String email, String role) {
        this.id = id;
        this.username = username;
        this.password = password;
        this.email = email;
        this.role = role;
    }

    // Gettery i settery
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }
}
