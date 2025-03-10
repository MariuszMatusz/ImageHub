package com.imagehub.imagehub.controller;

import com.imagehub.imagehub.model.User;
import com.imagehub.imagehub.service.NextcloudService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/nextcloud")
public class NextcloudController {
    private static final Logger logger = LoggerFactory.getLogger(NextcloudController.class);

    private final NextcloudService nextcloudService;

    @Autowired
    public NextcloudController(NextcloudService nextcloudService) {
        this.nextcloudService = nextcloudService;
        logger.info("🔹 Nextcloud controller initialized");
    }

    @GetMapping("/files")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> listFiles(
            @RequestParam(defaultValue = "") String path,
            @RequestParam(defaultValue = "true") boolean includeChildren,
            @RequestParam(defaultValue = "2") int depth,
            @AuthenticationPrincipal User currentUser) {
        try {
            logger.info("Received request to list files at path: {} (includeChildren: {}, depth: {}) for user: {}",
                    path, includeChildren, depth, currentUser.getUsername());
            List<Map<String, Object>> files = nextcloudService.listFilesWithChildren(path, includeChildren, depth, currentUser);
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
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> listMyFolders(@AuthenticationPrincipal User currentUser) {
        try {
            logger.info("Received request to list accessible folders for user: {}", currentUser.getUsername());
            List<Map<String, Object>> folders = nextcloudService.listAccessibleFolders(currentUser);
            return ResponseEntity.ok(folders);
        } catch (Exception e) {
            logger.error("Error listing accessible folders: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(null);
        }
    }

    @GetMapping("/files/{path:.+}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<byte[]> downloadFile(
            @PathVariable String path,
            @AuthenticationPrincipal User currentUser) {
        try {
            logger.info("Received request to download file: {} by user: {}", path, currentUser.getUsername());
            byte[] fileContent = nextcloudService.downloadFile(path, currentUser);
            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .body(fileContent);
        } catch (SecurityException e) {
            logger.warn("Security violation: {} for file {} by user {}",
                    e.getMessage(), path, currentUser.getUsername());
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(null);
        } catch (Exception e) {
            logger.error("Error downloading file {}: {}", path, e.getMessage(), e);
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

    @DeleteMapping("/files/{path:.+}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<String> deleteFile(
            @PathVariable String path,
            @AuthenticationPrincipal User currentUser) {
        try {
            logger.info("Received request to delete resource: {} by user: {}", path, currentUser.getUsername());
            nextcloudService.delete(path, currentUser);
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
}