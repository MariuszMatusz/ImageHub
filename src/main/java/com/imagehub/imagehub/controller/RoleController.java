package com.imagehub.imagehub.controller;

import com.imagehub.imagehub.model.Role;
import com.imagehub.imagehub.service.RoleService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.*;

@RestController
@RequestMapping("/api/roles")
public class RoleController {

    private static final Logger logger = LoggerFactory.getLogger(RoleController.class);

    @Autowired
    private RoleService roleService;

    /**
     * Pobierz wszystkie role
     */
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Role>> getAllRoles() {
        logger.info("Pobieranie wszystkich ról");
        return ResponseEntity.ok(roleService.findAll());
    }

    /**
     * Pobierz pojedynczą rolę po ID
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Role> getRoleById(@PathVariable Long id) {
        logger.info("Pobieranie roli o ID: {}", id);
        return roleService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Utwórz nową rolę
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> createRole(@Valid @RequestBody Role role) {
        logger.info("Tworzenie nowej roli: {}", role.getName());
        try {
            Role savedRole = roleService.save(role);
            return ResponseEntity.status(HttpStatus.CREATED).body(savedRole);
        } catch (IllegalArgumentException e) {
            logger.warn("Błąd podczas tworzenia roli: {}", e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Aktualizuj istniejącą rolę
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateRole(@PathVariable Long id, @Valid @RequestBody Role role) {
        logger.info("Aktualizacja roli o ID: {}", id);

        Optional<Role> existingRoleOpt = roleService.findById(id);
        if (existingRoleOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Role existingRole = existingRoleOpt.get();

        // Nie pozwól na zmianę nazwy roli systemowej
        if (existingRole.isSystemRole() && !existingRole.getName().equals(role.getName())) {
            return ResponseEntity.badRequest().body("Nie można zmienić nazwy roli systemowej");
        }

        // Zachowaj status roli systemowej
        role.setId(id);
        role.setSystemRole(existingRole.isSystemRole());

        try {
            Role updatedRole = roleService.save(role);
            return ResponseEntity.ok(updatedRole);
        } catch (IllegalArgumentException e) {
            logger.warn("Błąd podczas aktualizacji roli: {}", e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Usuń rolę
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteRole(@PathVariable Long id) {
        logger.info("Usuwanie roli o ID: {}", id);

        Optional<Role> roleOpt = roleService.findById(id);
        if (roleOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Role role = roleOpt.get();

        try {
            roleService.deleteById(id);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            logger.warn("Nie można usunąć roli: {}", e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Pobierz wszystkie dostępne uprawnienia
     */
    @GetMapping("/permissions")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Map<String, String>>> getAllPermissions() {
        logger.info("Pobieranie wszystkich dostępnych uprawnień");

        List<Map<String, String>> formattedPermissions = new ArrayList<>();
        Map<String, List<String>> categorizedPermissions = new HashMap<>();

        // Kategoryzuj uprawnienia
        for (String permission : roleService.getAllAvailablePermissions()) {
            String category;
            String name;
            String description;

            if (permission.startsWith("files_")) {
                category = "Pliki";
                if (permission.equals("files_read")) {
                    name = "Odczyt plików";
                    description = "Możliwość przeglądania plików";
                } else if (permission.equals("files_write")) {
                    name = "Zapis plików";
                    description = "Możliwość dodawania i modyfikowania plików";
                } else if (permission.equals("files_write_own")) {
                    name = "Zapis własnych plików";
                    description = "Możliwość dodawania i modyfikowania tylko własnych plików";
                } else if (permission.equals("files_delete")) {
                    name = "Usuwanie plików";
                    description = "Możliwość usuwania plików";
                } else if (permission.equals("files_delete_own")) {
                    name = "Usuwanie własnych plików";
                    description = "Możliwość usuwania tylko własnych plików";
                } else {
                    name = permission;
                    description = "";
                }
            } else if (permission.startsWith("users_")) {
                category = "Użytkownicy";
                if (permission.equals("users_read")) {
                    name = "Odczyt użytkowników";
                    description = "Możliwość przeglądania listy użytkowników";
                } else if (permission.equals("users_write")) {
                    name = "Edycja użytkowników";
                    description = "Możliwość dodawania i modyfikowania użytkowników";
                } else if (permission.equals("users_delete")) {
                    name = "Usuwanie użytkowników";
                    description = "Możliwość usuwania użytkowników";
                } else {
                    name = permission;
                    description = "";
                }
            } else if (permission.startsWith("roles_")) {
                category = "Role";
                if (permission.equals("roles_read")) {
                    name = "Odczyt ról";
                    description = "Możliwość przeglądania ról";
                } else if (permission.equals("roles_write")) {
                    name = "Edycja ról";
                    description = "Możliwość dodawania i modyfikowania ról";
                } else if (permission.equals("roles_delete")) {
                    name = "Usuwanie ról";
                    description = "Możliwość usuwania ról";
                } else {
                    name = permission;
                    description = "";
                }
            } else {
                category = "Inne";
                name = permission;
                description = "";
            }

            Map<String, String> permissionInfo = new HashMap<>();
            permissionInfo.put("id", permission);
            permissionInfo.put("name", name);
            permissionInfo.put("description", description);
            permissionInfo.put("category", category);

            formattedPermissions.add(permissionInfo);
        }

        return ResponseEntity.ok(formattedPermissions);
    }
}