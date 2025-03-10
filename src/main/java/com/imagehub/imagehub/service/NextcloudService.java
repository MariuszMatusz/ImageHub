package com.imagehub.imagehub.service;

import com.github.sardine.DavResource;
import com.imagehub.imagehub.model.FolderPermission;
import com.imagehub.imagehub.model.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class NextcloudService {
    private static final Logger logger = LoggerFactory.getLogger(NextcloudService.class);

    private final NextcloudClient nextcloudClient;
    private final FolderPermissionService folderPermissionService;

    @Autowired
    public NextcloudService(NextcloudClient nextcloudClient, FolderPermissionService folderPermissionService) {
        this.nextcloudClient = nextcloudClient;
        this.folderPermissionService = folderPermissionService;
        logger.info("🔹 Nextcloud service initialized");
    }

    /**
     * Lista plików z uwzględnieniem uprawnień użytkownika
     */
    public List<Map<String, Object>> listFiles(String path, User currentUser) throws Exception {
        return listFilesWithChildren(path, true, 2, currentUser);
    }

    /**
     * Lista plików z uwzględnieniem uprawnień użytkownika
     * z możliwością zagłębiania się w podfoldery
     */
    public List<Map<String, Object>> listFilesWithChildren(String path, boolean includeChildren, int depth, User currentUser) throws Exception {
        logger.info("Listing files at path: {} (includeChildren: {}, depth: {})", path, includeChildren, depth);
        List<DavResource> resources = nextcloudClient.listFiles(path);
        logger.info("Received {} resources from Nextcloud for path {}", resources.size(), path);

        List<Map<String, Object>> result = new ArrayList<>();

        for (int i = 0; i < resources.size(); i++) {
            DavResource resource = resources.get(i);
            var skipping = i == 0 && path.isEmpty() && resource.getName().equals("");
            var isEmpty = resource.getName().isEmpty();
            var skipAdminDirectory = path.isEmpty() && resource.getName().equals("admin");
            boolean condition = skipping || skipAdminDirectory || isEmpty;

            if (!condition) {
                String resourcePath = buildFullPath(path, resource.getName());

                // Sprawdź uprawnienia do odczytu - pomijamy zasoby, do których użytkownik nie ma dostępu
                if (!folderPermissionService.canUserReadFolder(currentUser, resourcePath)) {
                    logger.debug("User {} has no read permission for {}, skipping", currentUser.getUsername(), resourcePath);
                    continue;
                }

                Map<String, Object> fileInfo = new HashMap<>();
                fileInfo.put("name", resource.getName());
                fileInfo.put("path", resourcePath);
                fileInfo.put("isDirectory", resource.isDirectory());
                fileInfo.put("contentType", resource.getContentType());
                fileInfo.put("contentLength", resource.getContentLength());
                fileInfo.put("lastModified", resource.getModified());

                // Dodaj informacje o uprawnieniach
                fileInfo.put("canWrite", folderPermissionService.canUserWriteFolder(currentUser, resourcePath));
                fileInfo.put("canDelete", folderPermissionService.canUserDeleteFolder(currentUser, resourcePath));

                // Dodaj informacje o folder do wyniku
                result.add(fileInfo);

                // Jeśli to katalog i mamy zagłębiać się w strukturę
                if (includeChildren && resource.isDirectory() && depth > 0 && !resource.getName().isEmpty()) {
                    try {
                        logger.info("Recursively listing files in subfolder: {}", resourcePath);

                        // Rekurencyjnie pobierz zawartość podfolderu
                        List<Map<String, Object>> children = listFilesWithChildren(resourcePath, includeChildren, depth - 1, currentUser);

                        // Dodaj dzieci do bieżącego folderu
                        if (!children.isEmpty()) {
                            fileInfo.put("children", children);
                        }
                    } catch (Exception e) {
                        logger.warn("Error listing contents of subfolder {}: {}", resource.getName(), e.getMessage());
                    }
                }
            }
        }

        logger.info("Returning {} entries for path {}", result.size(), path);
        return result;
    }

    /**
     * Lista tylko tych folderów, do których użytkownik ma dostęp
     */
    public List<Map<String, Object>> listAccessibleFolders(User currentUser) throws Exception {
        // Dla admina pobieramy wszystkie foldery
        if (currentUser.getRole().name().equals("ADMIN")) {
            return listFiles("", currentUser);
        }

        // Folder główny "my-folders"
        Map<String, Object> myFoldersRoot = new HashMap<>();
        myFoldersRoot.put("name", "my-folders");
        myFoldersRoot.put("path", "my-folders");
        myFoldersRoot.put("isDirectory", true);

        // Pobierz uprawnienia użytkownika
        List<Map<String, Object>> userFolders = new ArrayList<>();

        List<FolderPermission> permissions = folderPermissionService.getUserPermissions(currentUser);

        // Dla każdego uprawnienia próbujemy pobrać informacje o folderze
        for (FolderPermission permission : permissions) {
            if (permission.isCanRead()) {
                try {
                    String folderPath = permission.getFolderPath();

                    // Pobierz informacje o folderze z Nextcloud
                    List<Map<String, Object>> folderInfo = listFilesWithChildren(folderPath, true, 2, currentUser);

                    // Dodaj do listy folderów użytkownika
                    userFolders.addAll(folderInfo);
                } catch (Exception e) {
                    logger.warn("Error fetching folder info for {}: {}", permission.getFolderPath(), e.getMessage());
                }
            }
        }

        // Dodaj podfoldery do głównego folderu "my-folders"
        myFoldersRoot.put("children", userFolders);

        // Zwróć tylko główny folder z jego dziećmi
        List<Map<String, Object>> result = new ArrayList<>();
        result.add(myFoldersRoot);
        return result;
    }

    /**
     * Pobierz plik z uwzględnieniem uprawnień użytkownika
     */
    public byte[] downloadFile(String path, User currentUser) throws Exception {
        // Sprawdź uprawnienia do odczytu
        if (!folderPermissionService.canUserReadFolder(currentUser, path)) {
            logger.warn("User {} attempted to download file {} without permission", currentUser.getUsername(), path);
            throw new SecurityException("No read permission for this file");
        }

        logger.info("Downloading file: {}", path);
        InputStream is = nextcloudClient.downloadFile(path);
        ByteArrayOutputStream buffer = new ByteArrayOutputStream();

        int nRead;
        byte[] data = new byte[16384];

        while ((nRead = is.read(data, 0, data.length)) != -1) {
            buffer.write(data, 0, nRead);
        }

        buffer.flush();
        return buffer.toByteArray();
    }

    /**
     * Wgraj plik z uwzględnieniem uprawnień użytkownika
     */
    public void uploadFile(String path, byte[] data, User currentUser) throws Exception {
        // Sprawdź uprawnienia do zapisu
        if (!folderPermissionService.canUserWriteFolder(currentUser, extractParentPath(path))) {
            logger.warn("User {} attempted to upload file to {} without permission", currentUser.getUsername(), path);
            throw new SecurityException("No write permission for this folder");
        }

        logger.info("Uploading file to: {}", path);
        nextcloudClient.uploadFile(path, data);
    }

    /**
     * Utwórz katalog z uwzględnieniem uprawnień użytkownika
     */
    public void createDirectory(String path, User currentUser) throws Exception {
        // Sprawdź uprawnienia do zapisu w folderze nadrzędnym
        if (!folderPermissionService.canUserWriteFolder(currentUser, extractParentPath(path))) {
            logger.warn("User {} attempted to create directory {} without permission", currentUser.getUsername(), path);
            throw new SecurityException("No write permission for parent folder");
        }

        logger.info("Creating directory: {}", path);
        nextcloudClient.createDirectory(path);
    }

    /**
     * Usuń zasób z uwzględnieniem uprawnień użytkownika
     */
    public void delete(String path, User currentUser) throws Exception {
        // Sprawdź uprawnienia do usuwania
        if (!folderPermissionService.canUserDeleteFolder(currentUser, path)) {
            logger.warn("User {} attempted to delete resource {} without permission", currentUser.getUsername(), path);
            throw new SecurityException("No delete permission for this resource");
        }

        logger.info("Deleting resource: {}", path);
        nextcloudClient.delete(path);
    }

    /**
     * Pomocnicza metoda do budowania pełnej ścieżki
     */
    private String buildFullPath(String parentPath, String resourceName) {
        if (parentPath.isEmpty()) {
            return resourceName;
        } else if (parentPath.endsWith("/")) {
            return parentPath + resourceName;
        } else {
            return parentPath + "/" + resourceName;
        }
    }

    /**
     * Pomocnicza metoda do wyodrębnienia ścieżki rodzica
     */
    private String extractParentPath(String path) {
        int lastSlashIndex = path.lastIndexOf('/');
        if (lastSlashIndex == -1) {
            return "";
        }
        return path.substring(0, lastSlashIndex);
    }
}