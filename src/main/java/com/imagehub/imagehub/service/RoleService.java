package com.imagehub.imagehub.service;

import com.imagehub.imagehub.model.Role;
import com.imagehub.imagehub.repository.RoleRepository;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
public class RoleService {

    private static final Logger logger = LoggerFactory.getLogger(RoleService.class);

    @Autowired
    private RoleRepository roleRepository;

    /**
     * Inicjalizacja domyślnych ról systemowych podczas uruchamiania aplikacji
     */
    @PostConstruct
    public void initSystemRoles() {
        logger.info("Inicjalizacja domyślnych ról systemowych");

        // Uprawnienia dla roli ADMIN
        Set<String> adminPermissions = new HashSet<>();
        adminPermissions.add("files_read");
        adminPermissions.add("files_write");
        adminPermissions.add("files_delete");
        adminPermissions.add("files_download");
        adminPermissions.add("users_read");
        adminPermissions.add("users_write");
        adminPermissions.add("users_delete");
        adminPermissions.add("roles_read");
        adminPermissions.add("roles_write");
        adminPermissions.add("roles_delete");

        // Uprawnienia dla roli USER
        Set<String> userPermissions = new HashSet<>();
        userPermissions.add("files_read");
        userPermissions.add("files_write_own");
        userPermissions.add("files_delete_own");
        userPermissions.add("files_download");

        // Utwórz rolę ADMIN jeśli nie istnieje
        if (!roleRepository.existsByName("ADMIN")) {
            Role adminRole = new Role("ADMIN", "Pełny dostęp do wszystkich funkcji systemu", adminPermissions, true);
            roleRepository.save(adminRole);
            logger.info("Utworzono rolę systemową ADMIN");
        }

        // Utwórz rolę USER jeśli nie istnieje
        if (!roleRepository.existsByName("USER")) {
            Role userRole = new Role("USER", "Podstawowy dostęp do plików zgodnie z uprawnieniami folderów", userPermissions, true);
            roleRepository.save(userRole);
            logger.info("Utworzono rolę systemową USER");
        }
    }

    /**
     * Pobierz wszystkie role
     */
    public List<Role> findAll() {
        return roleRepository.findAll();
    }

    /**
     * Pobierz rolę po ID
     */
    public Optional<Role> findById(Long id) {
        return roleRepository.findById(id);
    }

    /**
     * Pobierz rolę po nazwie
     */
    public Optional<Role> findByName(String name) {
        return roleRepository.findByName(name);
    }

    /**
     * Zapisz rolę
     */
    @Transactional
    public Role save(Role role) {
        // Sprawdź, czy rola o podanej nazwie już istnieje
        Optional<Role> existingRole = roleRepository.findByName(role.getName());

        if (existingRole.isPresent() && !existingRole.get().getId().equals(role.getId())) {
            throw new IllegalArgumentException("Rola o nazwie " + role.getName() + " już istnieje");
        }

        return roleRepository.save(role);
    }

    /**
     * Usuń rolę po ID
     */
    @Transactional
    public void deleteById(Long id) {
        Optional<Role> roleOpt = roleRepository.findById(id);

        if (roleOpt.isPresent()) {
            Role role = roleOpt.get();

            // Nie pozwól na usunięcie ról systemowych
            if (role.isSystemRole()) {
                throw new IllegalArgumentException("Nie można usunąć roli systemowej: " + role.getName());
            }

            roleRepository.deleteById(id);
        }
    }

    /**
     * Pobierz listę wszystkich dostępnych uprawnień w systemie
     */
    public List<String> getAllAvailablePermissions() {
        return List.of(
                "files_read", "files_write", "files_delete", "files_write_own", "files_delete_own",
                "users_read", "users_write", "users_delete",
                "roles_read", "roles_write", "roles_delete"
        );
    }
}