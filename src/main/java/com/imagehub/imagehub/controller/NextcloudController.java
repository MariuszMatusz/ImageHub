package com.imagehub.imagehub.controller;

import com.imagehub.imagehub.model.User;
import com.imagehub.imagehub.service.NextcloudService;
import com.imagehub.imagehub.service.NextcloudSyncService;
import com.imagehub.imagehub.service.UserService;
import jakarta.servlet.http.HttpServletResponse;
import com.imagehub.imagehub.service.FolderPermissionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;

@RestController
@RequestMapping("/api/nextcloud")
public class NextcloudController {

  
    private static final Logger logger = LoggerFactory.getLogger(NextcloudController.class);

    private final NextcloudService nextcloudService;
    private final NextcloudSyncService nextcloudSyncService;
    private final FolderPermissionService folderPermissionService;

    @Autowired
    public NextcloudController(NextcloudService nextcloudService, NextcloudSyncService nextcloudSyncService, FolderPermissionService folderPermissionService) {
        this.nextcloudService = nextcloudService;
        this.nextcloudSyncService = nextcloudSyncService;
        this.folderPermissionService = folderPermissionService;
        logger.info("🔹 Kontroler Nextcloud zainicjalizowany");
    }

    @GetMapping("/files")
//    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Map<String, Object>>> listFiles(
            @RequestParam(defaultValue = "") String path,
            @RequestParam(defaultValue = "true") boolean includeChildren,
            @RequestParam(defaultValue = "2") int depth,
            @AuthenticationPrincipal User currentUser) {
        try {
            logger.info("Received request to list files at path: {} (includeChildren: {}, depth: {}) for user: {}",
                    path, includeChildren, depth, currentUser.getUsername());

            List<Map<String, Object>> files = nextcloudService.listFilesWithChildren(path, includeChildren, depth, currentUser);

            // Usuń zduplikowane podfoldery
            removeDuplicateFolders(files);

            return ResponseEntity.ok(files);
        } catch (SecurityException e) {
            logger.warn("Security violation: {} for path {} by user {}",
                    e.getMessage(), path, currentUser.getUsername());
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(null);
        } catch (Exception e) {
            logger.error("Error listing files at path {}: {}", path, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(null);
        }
    }

    @GetMapping("/my-folders")
    @PreAuthorize("isAuthenticated()")
//    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> listMyFolders(@AuthenticationPrincipal User currentUser) {
        logger.info("Received request to list My Folders");
        try {
            logger.info("Received request to list accessible folders for user: {}", currentUser.getUsername());

            List<Map<String, Object>> folders = nextcloudService.listAccessibleFolders(currentUser);

            // Usuń zduplikowane podfoldery
            removeDuplicateFolders(folders);

            return ResponseEntity.ok(folders);
        } catch (Exception e) {
            logger.error("Error listing accessible folders: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(null);
        }
    }

    /**
     * Rekurencyjnie usuwa zduplikowane foldery z hierarchii
     * Usuwa podfoldery, które mają taką samą nazwę jak ich folder nadrzędny
     */
    /**
     * Rekurencyjnie usuwa zduplikowane foldery z hierarchii na wszystkich poziomach
     */
    private void removeDuplicateFolders(List<Map<String, Object>> folders) {
        if (folders == null || folders.isEmpty()) {
            return;
        }

        // Pętla po wszystkich folderach na tym poziomie
        for (Map<String, Object> folder : folders) {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> children = (List<Map<String, Object>>) folder.get("children");

            if (children != null && !children.isEmpty()) {
                String folderName = (String) folder.get("name");
                String folderPath = (String) folder.get("path");

                // Usuń duplikaty bezpośrednich dzieci
                removeDuplicateDirectChildren(folder, children);

                // Rekurencyjnie przetwarzaj pozostałe dzieci
                removeDuplicateFolders(children);

                // Dla każdego dziecka, sprawdź czy jego dzieci nie są duplikatami
                for (Map<String, Object> child : new ArrayList<>(children)) {
                    @SuppressWarnings("unchecked")
                    List<Map<String, Object>> grandchildren = (List<Map<String, Object>>) child.get("children");

                    if (grandchildren != null && !grandchildren.isEmpty()) {
                        String childName = (String) child.get("name");
                        String childPath = (String) child.get("path");

                        // Usuń duplikaty wnuków
                        removeDuplicateDirectChildren(child, grandchildren);
                    }
                }
            }
        }
    }

    /**
     * Usuwa bezpośrednie dzieci, które są duplikatami rodzica
     */
    private void removeDuplicateDirectChildren(Map<String, Object> parent, List<Map<String, Object>> children) {
        if (children == null || children.isEmpty()) {
            return;
        }

        String parentName = (String) parent.get("name");
        String parentPath = (String) parent.get("path");

        // Użyj iteratora do bezpiecznego usuwania podczas iteracji
        Iterator<Map<String, Object>> iterator = children.iterator();
        while (iterator.hasNext()) {
            Map<String, Object> child = iterator.next();
            String childName = (String) child.get("name");
            String childPath = (String) child.get("path");

            // Wykryj duplikat: jeśli nazwa dziecka jest taka sama jak nazwa rodzica
            // i ścieżka dziecka jest podścieżką rodzica (np. "Bikes/Bikes")
            if (parentName.equals(childName) && childPath.equals(parentPath + "/" + childName)) {
                // Pobierz dzieci duplikatu przed jego usunięciem
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> grandchildren = (List<Map<String, Object>>) child.get("children");

                // Usuń duplikat
                iterator.remove();
                logger.debug("Removed duplicate folder: {} (path: {})", childName, childPath);

                // Przenieś dzieci usuniętego duplikatu do rodzica, jeśli istnieją
                if (grandchildren != null && !grandchildren.isEmpty()) {
                    children.addAll(grandchildren);
                    logger.debug("Moved {} grandchildren to parent folder", grandchildren.size());
                }
            }
        }
    }

//    @GetMapping("/files/{path:.+}")
@GetMapping("/files/download")
@PreAuthorize("hasAnyRole('USER', 'ADMIN')")
public ResponseEntity<byte[]> downloadFile(
        @RequestParam("file") String path,
        @AuthenticationPrincipal User currentUser) {
    try {
        logger.info("Otrzymano żądanie pobrania pliku: {} przez użytkownika: {}", path, currentUser.getUsername());
        byte[] fileContent = nextcloudService.downloadFile(path, currentUser);

        // Pobierz nazwę pliku z ścieżki
        String fileName = path.substring(path.lastIndexOf('/') + 1);
        if (fileName.isEmpty()) {
            fileName = "file";
        }

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                .body(fileContent);
    } catch (SecurityException e) {
        logger.warn("Naruszenie bezpieczeństwa: {} dla pliku {} przez użytkownika {}",
                e.getMessage(), path, currentUser.getUsername());
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(null);
    } catch (Exception e) {
        logger.error("Błąd podczas pobierania pliku {}: {}", path, e.getMessage(), e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(null);
    }
}

    @GetMapping("/files/download-zip")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<byte[]> downloadFolderAsZip(
            @RequestParam("file") String folderPath,
            @AuthenticationPrincipal User currentUser) {
        try {
            logger.info("Otrzymano żądanie pobrania folderu jako zip: {} przez użytkownika: {}",
                    folderPath, currentUser.getUsername());

            // Zamiast bezpośredniego odwołania do folderPermissionService, używamy nextcloudService
            // Sprawdzanie uprawnień zostanie wykonane wewnątrz metody createZipFromFolder

            // Wygeneruj zip z folderu
            byte[] zipData = nextcloudService.createZipFromFolder(folderPath, currentUser);

            // Aby użyć extractLastPathSegment, możesz albo dodać tę metodę do kontrolera,
            // albo użyć istniejącej metody z nextcloudService
            String folderName = folderPath.substring(folderPath.lastIndexOf('/') + 1);
            if (folderName.isEmpty()) {
                folderName = "file";
            }

            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + folderName + ".zip\"")
                    .body(zipData);
        } catch (SecurityException e) {
            logger.warn("Naruszenie bezpieczeństwa: {} dla folderu {} przez użytkownika {}",
                    e.getMessage(), folderPath, currentUser.getUsername());
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(null);
        } catch (Exception e) {
            logger.error("Błąd podczas tworzenia zip dla folderu {}: {}", folderPath, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(null);
        }
    }

    @PostMapping("/upload")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<String> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam("path") String path,
            @AuthenticationPrincipal User currentUser) {
        try {
            logger.info("Received request to upload file {} to path: {} by user: {}",
                    file.getOriginalFilename(), path, currentUser.getUsername());
            nextcloudService.uploadFile(path + "/" + file.getOriginalFilename(), file.getBytes(), currentUser);
            return ResponseEntity.ok("Plik został przesłany pomyślnie");
        } catch (SecurityException e) {
            logger.warn("Security violation: {} for upload to {} by user {}",
                    e.getMessage(), path, currentUser.getUsername());
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Brak uprawnień do przesyłania plików do tego folderu");
        } catch (Exception e) {
            logger.error("Error uploading file to {}: {}", path, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Błąd podczas przesyłania pliku: " + e.getMessage());
        }
    }

    @PostMapping("/directory")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<String> createDirectory(
            @RequestParam("path") String path,
            @AuthenticationPrincipal User currentUser) {
        try {
            logger.info("Received request to create directory: {} by user: {}", path, currentUser.getUsername());
            nextcloudService.createDirectory(path, currentUser);
            return ResponseEntity.ok("Katalog został utworzony pomyślnie");
        } catch (SecurityException e) {
            logger.warn("Security violation: {} for creating directory {} by user {}",
                    e.getMessage(), path, currentUser.getUsername());
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Brak uprawnień do tworzenia katalogu w tej lokalizacji");
        } catch (Exception e) {
            logger.error("Error creating directory {}: {}", path, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Błąd podczas tworzenia katalogu: " + e.getMessage());
        }
    }

    @DeleteMapping("/files")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<String> deleteFile(
            @RequestParam ("file") String path,
            @AuthenticationPrincipal User currentUser) {
        try {
            logger.info("Controler 1");
            logger.info("Received request to delete resource: {} by user: {}", path, currentUser.getUsername());
            nextcloudService.delete(path, currentUser);
            logger.info("Controler 2");
            return ResponseEntity.ok("Element został usunięty pomyślnie");
        } catch (SecurityException e) {
            logger.warn("Security violation: {} for deleting {} by user {}",
                    e.getMessage(), path, currentUser.getUsername());
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Brak uprawnień do usunięcia tego elementu");
        } catch (Exception e) {
            logger.error("Error deleting resource {}: {}", path, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Błąd podczas usuwania: " + e.getMessage());
        }
    }

    /**
     * Endpoint do wymuszenia synchronizacji z Nextcloud
     */
    @PostMapping("/sync")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> forceSync() {
        try {
            logger.info("Otrzymano żądanie wymuszenia synchronizacji Nextcloud");
            nextcloudSyncService.forceSynchronization();

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("lastSyncTime", nextcloudSyncService.getLastSyncTime());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Błąd podczas wymuszonej synchronizacji: {}", e.getMessage(), e);

            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("error", e.getMessage());

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(response);
        }
    }

    /**
     * Pobierz status synchronizacji
     */
    @GetMapping("/sync/status")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<Map<String, Object>> getSyncStatus() {
        Map<String, Object> status = new HashMap<>();
        status.put("lastSyncTime", nextcloudSyncService.getLastSyncTime());
        return ResponseEntity.ok(status);
    }

    /**
     * Endpoint do wyszukiwania plików i folderów w Nextcloud
     */
    @GetMapping("/search")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> searchFiles(
            @RequestParam("query") String query,
            @AuthenticationPrincipal User currentUser) {
        try {
            logger.info("Received search request with query: '{}' from user: {}",
                    query, currentUser.getUsername());

            if (query.trim().isEmpty()) {
                logger.info("Empty search query, returning empty result");
                return ResponseEntity.ok(new ArrayList<>());
            }

            List<Map<String, Object>> searchResults = nextcloudService.searchFiles(query, currentUser);

            logger.info("Found {} items matching query '{}'", searchResults.size(), query);
            return ResponseEntity.ok(searchResults);
        } catch (SecurityException e) {
            logger.warn("Security violation during search: {} by user {}",
                    e.getMessage(), currentUser.getUsername());
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(null);
        } catch (Exception e) {
            logger.error("Error searching files with query '{}': {}", query, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(null);
        }
    }

    @GetMapping("/product-info")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<Map<String, Object>> getProductInfo(
            @RequestParam("path") String path,
            @AuthenticationPrincipal User currentUser) {
        try {
            logger.info("Getting product info: {} by user: {}", path, currentUser.getUsername());

            // Check permissions
            if (!folderPermissionService.canUserReadFolder(currentUser, path)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(null);
            }

            // Get product info
            Map<String, Object> productInfo = nextcloudService.getProductInfo(path, currentUser);

            return ResponseEntity.ok(productInfo);
        } catch (Exception e) {
            logger.error("Error getting product info {}: {}", path, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }
}
