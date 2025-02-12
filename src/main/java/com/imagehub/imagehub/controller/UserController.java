package com.imagehub.imagehub.controller;

import com.imagehub.imagehub.model.Role;
import com.imagehub.imagehub.model.User;
import com.imagehub.imagehub.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.security.Principal;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/users")
@Validated
public class UserController {

    @Autowired
    private UserService userService;

    // 🔹 ADMIN: Pobieranie listy użytkowników
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping
    public ResponseEntity<List<User>> getAllUsers() {
        return ResponseEntity.ok(userService.findAll());
    }

    // 🔹 ADMIN: Pobieranie użytkowników według roli
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/role/{role}")
    public ResponseEntity<List<User>> getUsersByRole(@PathVariable Role role) {
        return ResponseEntity.ok(userService.findByRole(role));
    }

    // 🔹 USER: Pobranie swojego konta (ADMIN widzi wszystkich)
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    @GetMapping("/{id}")
    public ResponseEntity<User> getUserById(@PathVariable Long id) {
        // Pobieramy użytkownika z bazy na podstawie przekazanego id
        Optional<User> foundUserOptional = userService.findById(id);
        if (foundUserOptional.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        User foundUser = foundUserOptional.get();

        // Pobieramy obiekt Authentication z SecurityContextHolder i rzutujemy na nasz typ User
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User loggedUser = (User) auth.getPrincipal();

        // Jeśli zalogowany użytkownik ma rolę ADMIN, zwracamy dane dowolnego użytkownika
        if (loggedUser.getRole().equals(Role.ADMIN)) {
            return ResponseEntity.ok(foundUser);
        }

        // Jeśli użytkownik nie jest ADMINEM, może pobierać tylko swoje dane (porównanie id)
        if (loggedUser.getId().equals(foundUser.getId())) {
            return ResponseEntity.ok(foundUser);
        }

        return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
    }












    // 🔹 ADMIN: Tworzenie użytkownika
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping
    public ResponseEntity<?> createUser(@Valid @RequestBody User user) {
        try {
            User savedUser = userService.save(user);
            return ResponseEntity.status(HttpStatus.CREATED).body(savedUser);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    // 🔹 ADMIN: Edycja użytkownika
    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}")
    public ResponseEntity<User> updateUser(@PathVariable Long id, @Valid @RequestBody User updatedUser) {
        Optional<User> existingUser = userService.findById(id);
        if (existingUser.isPresent()) {
            User user = existingUser.get();
            user.setUsername(updatedUser.getUsername());
            user.setEmail(updatedUser.getEmail());

            // ADMIN może aktualizować hasło użytkownika
            user.setPassword(userService.hashPassword(updatedUser.getPassword()));

            user.setRole(updatedUser.getRole());
            userService.save(user);
            return ResponseEntity.ok(user);
        } else {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }

    // 🔹 USER & ADMIN: Zmiana hasła (każdy użytkownik może zmienić swoje)
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    @PutMapping("/{id}/change-password")
    public ResponseEntity<?> changePassword(@PathVariable Long id, @RequestParam String oldPassword, @RequestParam String newPassword, Principal principal) {
        Optional<User> userOptional = userService.findById(id);
        if (userOptional.isPresent()) {
            User user = userOptional.get();

            // Sprawdzamy, czy użytkownik zmienia swoje hasło
            if (!user.getUsername().equals(principal.getName()) && !user.getRole().equals(Role.ADMIN)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("You can only change your own password!");
            }

            // Weryfikacja obecnego hasła
            if (!userService.checkPassword(oldPassword, user.getPassword())) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid current password!");
            }

            // Aktualizacja hasła
            user.setPassword(userService.hashPassword(newPassword));
            userService.save(user);
            return ResponseEntity.ok("Password updated successfully!");
        } else {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found!");
        }
    }

    // 🔹 ADMIN: Usuwanie użytkownika
    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        if (userService.findById(id).isPresent()) {
            userService.deleteById(id);
            return ResponseEntity.noContent().build();
        } else {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }
}
