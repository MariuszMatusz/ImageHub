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
}