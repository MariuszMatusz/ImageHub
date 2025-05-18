package com.imagehub.imagehub.service;

import com.imagehub.imagehub.model.FolderPermission;
import com.imagehub.imagehub.model.PermissionConstants;
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
     * Sprawdza czy użytkownik ma dostęp do odczytu folderu,
     * uwzględniając zarówno uprawnienia z roli jak i konkretne uprawnienia do folderów
     */
    public boolean canUserReadFolder(User user, String folderPath) {
        // Admini mają dostęp do wszystkiego
        if (user.getRole() != null && "ADMIN".equals(user.getRole().getName())) {
            return true;
        }

        // Sprawdź bezpośrednie uprawnienia do folderu
        if (folderPermissionRepository.hasReadPermission(user, folderPath)) {
            logger.debug("User {} has direct read permission for {}", user.getUsername(), folderPath);
            return true;
        }

        // Jeśli użytkownik ma uprawnienie do zapisu, to także może czytać
        if (canUserWriteFolder(user, folderPath)) {
            logger.debug("User {} has write permission for {}, granting read access",
                    user.getUsername(), folderPath);
            return true;
        }

        // Sprawdź czy użytkownik ma globalne uprawnienie z roli
        if (user.hasPermission(PermissionConstants.FILES_READ)) {
            logger.debug("User {} has global files_read permission", user.getUsername());
            return true;
        }

        return false;
    }

    /**
     * Sprawdza czy użytkownik ma dostęp do zapisu do folderu,
     * uwzględniając zarówno uprawnienia z roli jak i konkretne uprawnienia do folderów
     */
    public boolean canUserWriteFolder(User user, String folderPath) {
        // Admini mają dostęp do wszystkiego
        if (user.getRole() != null && "ADMIN".equals(user.getRole().getName())) {
            return true;
        }

        // Sprawdź bezpośrednie uprawnienia do folderu
        if (folderPermissionRepository.hasWritePermission(user, folderPath)) {
            logger.debug("User {} has direct write permission for {}", user.getUsername(), folderPath);
            return true;
        }

        // Sprawdź czy użytkownik ma globalne uprawnienie do zapisu
        if (user.hasPermission(PermissionConstants.FILES_WRITE)) {
            logger.debug("User {} has global files_write permission", user.getUsername());
            return true;
        }

        // Sprawdź uprawnienie do zapisu własnych folderów
        if (user.hasPermission(PermissionConstants.FILES_WRITE_OWN)) {
            logger.debug("User {} has files_write_own permission, checking if folder is assigned",
                    user.getUsername());
            // Sprawdź czy to jest folder, do którego użytkownik ma przypisane uprawnienia
            return folderPermissionRepository.hasWritePermission(user, folderPath);
        }

        return false;
    }

    /**
     * Sprawdza czy użytkownik ma dostęp do usuwania z folderu,
     * uwzględniając zarówno uprawnienia z roli jak i konkretne uprawnienia do folderów
     */
    public boolean canUserDeleteFolder(User user, String folderPath) {
        // Admini mają dostęp do wszystkiego
        if (user.getRole() != null && "ADMIN".equals(user.getRole().getName())) {
            return true;
        }

        // Sprawdź bezpośrednie uprawnienia do folderu
        if (folderPermissionRepository.hasDeletePermission(user, folderPath)) {
            logger.debug("User {} has direct delete permission for {}", user.getUsername(), folderPath);
            return true;
        }

        // Sprawdź czy użytkownik ma globalne uprawnienie do usuwania
        if (user.hasPermission(PermissionConstants.FILES_DELETE)) {
            logger.debug("User {} has global files_delete permission", user.getUsername());
            return true;
        }

        // Sprawdź uprawnienie do usuwania własnych folderów
        if (user.hasPermission(PermissionConstants.FILES_DELETE_OWN)) {
            logger.debug("User {} has files_delete_own permission, checking if folder is assigned",
                    user.getUsername());
            // Sprawdź czy to jest folder, do którego użytkownik ma przypisane uprawnienia
            return folderPermissionRepository.hasDeletePermission(user, folderPath);
        }

        return false;
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
     * Pobierz wszystkie uprawnienia dla określonego folderu
     */
    public List<FolderPermission> getPermissionsForFolder(String folderPath) {
        return folderPermissionRepository.findByFolderPath(folderPath);
    }

    /**
     * Zapisywanie określonego uprawnienia
     */
    public FolderPermission savePermission(FolderPermission permission) {
        return folderPermissionRepository.save(permission);
    }

    /**
     * Pobierz listę ścieżek dla folderów oznaczonych jako produkty
     */
    public List<String> getProductFolders() {
        return folderPermissionRepository.findByPermissionType(PERMISSION_TYPE_CHILDREN_AS_PRODUCTS)
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

    /**
     * Sprawdza, czy użytkownik ma dane uprawnienie do folderu,
     * uwzględniając zarówno jego rolę jak i uprawnienia do folderów
     */
    public boolean hasPermission(User user, String folderPath, String permission) {
        // Admini mają dostęp do wszystkiego
        if (user.getRole() != null && "ADMIN".equals(user.getRole().getName())) {
            return true;
        }

        // Sprawdź, czy użytkownik ma to uprawnienie w swojej roli
        if (user.hasPermission(permission)) {
            // Dla uprawnień do plików, sprawdź uprawnienia do folderu
            if (permission.startsWith("files_")) {
                switch (permission) {
                    case PermissionConstants.FILES_READ:
                        return canUserReadFolder(user, folderPath);
                    case PermissionConstants.FILES_WRITE:
                    case PermissionConstants.FILES_WRITE_OWN:
                        return canUserWriteFolder(user, folderPath);
                    case PermissionConstants.FILES_DELETE:
                    case PermissionConstants.FILES_DELETE_OWN:
                        return canUserDeleteFolder(user, folderPath);
                    case PermissionConstants.FILES_DOWNLOAD:
                        return canUserDownloadFolder(user, folderPath);
                }
            } else {
                // Dla innych uprawnień (nie związanych z folderami)
                return true;
            }
        }

        return false;
    }


    public FolderPermission setPermissionWithType(
            String folderPath,
            User user,
            boolean canRead,
            boolean canWrite,
            boolean canDelete,
            boolean canDownload,
            boolean includeSubfolders,
            String permissionType) {

        logger.info("Setting permissions for folder {} for user {}, type: {}",
                folderPath, user.getUsername(), permissionType);

        // Sprawdź, czy uprawnienie już istnieje
        Optional<FolderPermission> existingPermission =
                folderPermissionRepository.findByFolderPathAndUser(folderPath, user);

        if (existingPermission.isPresent()) {
            // Aktualizuj istniejące uprawnienie
            FolderPermission permission = existingPermission.get();
            permission.setCanRead(canRead);
            permission.setCanWrite(canWrite);
            permission.setCanDelete(canDelete);
            permission.setCanDownload(canDownload); // Dodajemy ustawienie canDownload
            permission.setIncludeSubfolders(includeSubfolders);
            permission.setPermissionType(permissionType);
            return folderPermissionRepository.save(permission);
        } else {
            // Utwórz nowe uprawnienie
            FolderPermission permission = new FolderPermission(
                    folderPath, user, canRead, canWrite, canDelete, canDownload, includeSubfolders, permissionType
            );
            return folderPermissionRepository.save(permission);
        }
    }

    /**
     * Sprawdza czy użytkownik ma dostęp do pobierania z folderu,
     * uwzględniając zarówno uprawnienia z roli jak i konkretne uprawnienia do folderów
     */
    public boolean canUserDownloadFolder(User user, String folderPath) {
        // Admini mają dostęp do wszystkiego
        if (user.getRole() != null && "ADMIN".equals(user.getRole().getName())) {
            return true;
        }

        // Sprawdź bezpośrednie uprawnienia do folderu
        if (folderPermissionRepository.hasDownloadPermission(user, folderPath)) {
            logger.debug("User {} has direct download permission for {}", user.getUsername(), folderPath);
            return true;
        }

        // Jeśli użytkownik ma uprawnienie do odczytu, to także może pobierać pliki
        // (chyba że ma jawnie wyłączone pobieranie w uprawnieniach do folderu)
        if (canUserReadFolder(user, folderPath)) {
            // Sprawdź, czy nie ma explicite wyłączonego pobierania
            Optional<FolderPermission> directPermission = folderPermissionRepository.findByFolderPathAndUser(folderPath, user);
            if (directPermission.isPresent() && !directPermission.get().isCanDownload()) {
                logger.debug("User {} has read permission but download is explicitly disabled for {}",
                        user.getUsername(), folderPath);
                return false;
            }

            logger.debug("User {} has read permission, granting download access for {}",
                    user.getUsername(), folderPath);
            return true;
        }

        // Sprawdź czy użytkownik ma globalne uprawnienie do pobierania
        if (user.hasPermission(PermissionConstants.FILES_DOWNLOAD)) {
            logger.debug("User {} has global files_download permission", user.getUsername());
            return true;
        }

        return false;
    }
}