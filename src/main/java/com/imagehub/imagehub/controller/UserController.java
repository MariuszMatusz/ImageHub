package com.imagehub.imagehub.controller;

import com.imagehub.imagehub.model.FolderPermission;
import com.imagehub.imagehub.service.FolderPermissionService;
import com.imagehub.imagehub.model.Role;
import com.imagehub.imagehub.model.User;
import com.imagehub.imagehub.service.RoleService;
import com.imagehub.imagehub.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/users")
@Validated
public class UserController {

    @Autowired
    private UserService userService;

    @Autowired
    private RoleService roleService;

    @Autowired
    private FolderPermissionService folderPermissionService;

    // ADMIN: Pobranie listy wszystkich użytkowników
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping
    public ResponseEntity<List<User>> getAllUsers() {
        return ResponseEntity.ok(userService.findAll());
    }

    // ADMIN: Pobranie użytkowników według roli (teraz przyjmuje nazwę roli jako String)
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/role/{roleName}")
    public ResponseEntity<?> getUsersByRole(@PathVariable("roleName") String roleName) {
        Optional<Role> roleOpt = roleService.findByName(roleName);

        if (roleOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Role not found: " + roleName);
        }

        return ResponseEntity.ok(userService.findByRole(roleOpt.get()));
    }

    // USER/ADMIN: Pobranie danych aktualnie zalogowanego użytkownika
//    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<User> getCurrentUser(@AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(currentUser);
    }

    // ADMIN: Pobranie danych użytkownika po ID
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/{id}")
    public ResponseEntity<User> getUserById(@PathVariable Long id) {
        Optional<User> requestedUserOpt = userService.findById(id);
        if (requestedUserOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        return ResponseEntity.ok(requestedUserOpt.get());
    }

    // ADMIN: Tworzenie nowego użytkownika
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

    // ADMIN: Aktualizacja użytkownika
    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}")
    public ResponseEntity<User> updateUser(@PathVariable Long id, @Valid @RequestBody User updatedUser) {
        Optional<User> existingUserOpt = userService.findById(id);
        if (existingUserOpt.isPresent()) {
            User user = existingUserOpt.get();
            user.setUsername(updatedUser.getUsername());
            user.setEmail(updatedUser.getEmail());
            if (updatedUser.getPassword() != null && !updatedUser.getPassword().isEmpty()) {
                user.setPassword(userService.hashPassword(updatedUser.getPassword()));
            }
            user.setRole(updatedUser.getRole());
            userService.save(user);
            return ResponseEntity.ok(user);
        } else {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }

    // USER/ADMIN: Zmiana hasła dla zalogowanego użytkownika
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    @PutMapping("/me/change-password")
    public ResponseEntity<?> changePassword(@AuthenticationPrincipal User currentUser,
                                            @RequestParam String oldPassword,
                                            @RequestParam String newPassword) {
        if (!userService.checkPassword(oldPassword, currentUser.getPassword())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid current password!");
        }
        currentUser.setPassword(userService.hashPassword(newPassword));
        userService.save(currentUser);
        return ResponseEntity.ok("Password updated successfully!");
    }

    // ADMIN: Usunięcie użytkownika
    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        if (userService.findById(id).isPresent()) {
            userService.deleteById(id);
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
    }

    @GetMapping("/me/permissions")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> getCurrentUserPermissions(@AuthenticationPrincipal User currentUser) {
        Map<String, Object> permissions = new HashMap<>();

        // Uprawnienia z roli
        permissions.put("rolePermissions", currentUser.getRole().getPermissions());

        // Uprawnienia do folderów
        List<FolderPermission> folderPermissions = folderPermissionService.getUserPermissions(currentUser);
        Map<String, Map<String, Boolean>> folderPermissionsMap = new HashMap<>();

        for (FolderPermission fp : folderPermissions) {
            Map<String, Boolean> folderPerms = new HashMap<>();
            folderPerms.put("canRead", fp.isCanRead());
            folderPerms.put("canWrite", fp.isCanWrite());
            folderPerms.put("canDelete", fp.isCanDelete());
            folderPerms.put("includeSubfolders", fp.isIncludeSubfolders());

            folderPermissionsMap.put(fp.getFolderPath(), folderPerms);
        }

        permissions.put("folderPermissions", folderPermissionsMap);
        permissions.put("isAdmin", "ADMIN".equals(currentUser.getRole().getName()));

        return ResponseEntity.ok(permissions);
    }

}