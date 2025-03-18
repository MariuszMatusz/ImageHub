package com.imagehub.imagehub.service;

import com.imagehub.imagehub.model.FolderPermission;
import com.imagehub.imagehub.model.Role;
import com.imagehub.imagehub.model.User;
import com.imagehub.imagehub.repository.FolderPermissionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import static com.imagehub.imagehub.model.FolderPermission.PERMISSION_TYPE_CHILDREN_AS_PRODUCTS;
import static com.imagehub.imagehub.model.FolderPermission.PERMISSION_TYPE_PRODUCT;

@Service
public class FolderPermissionService {
    private static final Logger logger = LoggerFactory.getLogger(FolderPermissionService.class);

    private final FolderPermissionRepository folderPermissionRepository;

    @Autowired
    public FolderPermissionService(FolderPermissionRepository folderPermissionRepository) {
        this.folderPermissionRepository = folderPermissionRepository;
        logger.info("🔹 Folder permission service initialized");
    }

    /**
     * Pobiera wszystkie uprawnienia dla danego użytkownika
     */
    public List<FolderPermission> getUserPermissions(User user) {
        return folderPermissionRepository.findByUser(user);
    }

    /**
     * Dodaje lub aktualizuje uprawnienie do folderu
     */
    @Transactional
    public FolderPermission setPermission(String folderPath, User user, boolean canRead, boolean canWrite,
                                          boolean canDelete, boolean includeSubfolders) {

        Optional<FolderPermission> existingPermission = folderPermissionRepository.findByFolderPathAndUser(folderPath, user);

        if (existingPermission.isPresent()) {
            FolderPermission permission = existingPermission.get();
            permission.setCanRead(canRead);
            permission.setCanWrite(canWrite);
            permission.setCanDelete(canDelete);
            permission.setIncludeSubfolders(includeSubfolders);
            logger.info("Updated permissions for user {} on folder {}", user.getUsername(), folderPath);
            return folderPermissionRepository.save(permission);
        } else {
            FolderPermission newPermission = new FolderPermission(folderPath, user, canRead, canWrite, canDelete, includeSubfolders);
            logger.info("Created new permissions for user {} on folder {}", user.getUsername(), folderPath);
            return folderPermissionRepository.save(newPermission);
        }
    }

    /**
     * Usuwa uprawnienie do folderu
     */
    @Transactional
    public void removePermission(Long permissionId) {
        folderPermissionRepository.deleteById(permissionId);
        logger.info("Removed permission with ID {}", permissionId);
    }

    /**
     * Sprawdza czy użytkownik ma dostęp do odczytu folderu
     */
    public boolean canUserReadFolder(User user, String folderPath) {
        // Admini mają dostęp do wszystkiego
        if (user.getRole() == Role.ADMIN) {
            return true;
        }

        return folderPermissionRepository.hasReadPermission(user, folderPath);
    }

    /**
     * Sprawdza czy użytkownik ma dostęp do zapisu do folderu
     */
    public boolean canUserWriteFolder(User user, String folderPath) {
        // Admini mają dostęp do wszystkiego
        if (user.getRole() == Role.ADMIN) {
            return true;
        }

        return folderPermissionRepository.hasWritePermission(user, folderPath);
    }

    /**
     * Sprawdza czy użytkownik ma dostęp do usunięcia folderu
     */
    public boolean canUserDeleteFolder(User user, String folderPath) {
        // Admini mają dostęp do wszystkiego
        if (user.getRole() == Role.ADMIN) {
            return true;
        }

        return folderPermissionRepository.hasDeletePermission(user, folderPath);
    }

    /**
     * Get all permissions for a specific folder
     */
    public List<FolderPermission> getPermissionsForFolder(String folderPath) {
        return folderPermissionRepository.findByFolderPath(folderPath);
    }

    /**
     * Save a specific permission
     */
    public FolderPermission savePermission(FolderPermission permission) {
        return folderPermissionRepository.save(permission);
    }

    /**
     * Get list of paths for folders marked as products
     */
    public List<String> getProductFolders() {
        return folderPermissionRepository.findByPermissionType("CHILDREN_AS_PRODUCTS")
                .stream()
                .map(FolderPermission::getFolderPath)
                .distinct()
                .collect(Collectors.toList());
    }

    /**
     * Sprawdź, czy folder jest produktem (nie folderem)
     */
    public boolean isProductFolder(String folderPath) {
        // Jeśli folder sam jest oznaczony jako "mający dzieci-produkty", to NIE jest produktem
        if (hasChildrenAsProducts(folderPath)) {
            return false;
        }

        // Sprawdź, czy folder jest dzieckiem folderu oznaczonego jako "mający dzieci-produkty"
        return isChildOfFolderWithProductChildren(folderPath);
    }

    /**
     * Sprawdź, czy folder jest rodzicem, którego dzieci są produktami
     */
    public boolean hasChildrenAsProducts(String folderPath) {
        return folderPermissionRepository.existsByFolderPathAndPermissionType(folderPath, PERMISSION_TYPE_CHILDREN_AS_PRODUCTS);
    }

    /**
     * Sprawdź, czy folder jest dzieckiem folderu, którego dzieci są produktami
     * (sprawdza rekurencyjnie całą hierarchię folderów)
     */
    public boolean isChildOfFolderWithProductChildren(String folderPath) {
        if (folderPath == null || folderPath.isEmpty()) {
            return false;
        }

        // Podziel ścieżkę na segmenty
        String[] segments = folderPath.split("/");
        StringBuilder currentPath = new StringBuilder();

        // Sprawdź każdy folder nadrzędny w hierarchii
        for (int i = 0; i < segments.length - 1; i++) {
            if (!segments[i].isEmpty()) {
                if (currentPath.length() > 0) {
                    currentPath.append("/");
                }
                currentPath.append(segments[i]);

                // Sprawdź, czy ten folder nadrzędny ma oznaczenie CHILDREN_AS_PRODUCTS
                String parentPath = currentPath.toString();
                if (hasChildrenAsProducts(parentPath)) {
                    logger.debug("Folder {} jest dzieckiem folderu {} oznaczonego jako mający dzieci-produkty",
                            folderPath, parentPath);
                    return true;
                }
            }
        }

        return false;
    }

}