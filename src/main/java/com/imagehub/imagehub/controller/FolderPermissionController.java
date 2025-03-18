package com.imagehub.imagehub.controller;

import com.imagehub.imagehub.model.FolderPermission;
import com.imagehub.imagehub.model.User;
import com.imagehub.imagehub.service.FolderPermissionService;
import com.imagehub.imagehub.service.UserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/folder-permissions")
public class FolderPermissionController {
    private static final Logger logger = LoggerFactory.getLogger(FolderPermissionController.class);

    @Autowired
    private FolderPermissionService folderPermissionService;

    @Autowired
    private UserService userService;

    /**
     * Pobierz wszystkie uprawnienia folderów dla zalogowanego użytkownika
     */
    @GetMapping("/my")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> getMyFolderPermissions(@AuthenticationPrincipal User currentUser) {
        logger.info("Getting folder permissions for user: {}", currentUser.getUsername());
        List<FolderPermission> permissions = folderPermissionService.getUserPermissions(currentUser);

        List<Map<String, Object>> result = permissions.stream().map(permission -> {
            Map<String, Object> permMap = new HashMap<>();
            permMap.put("id", permission.getId());
            permMap.put("folderPath", permission.getFolderPath());
            permMap.put("canRead", permission.isCanRead());
            permMap.put("canWrite", permission.isCanWrite());
            permMap.put("canDelete", permission.isCanDelete());
            permMap.put("includeSubfolders", permission.isIncludeSubfolders());
            return permMap;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    /**
     * Administrator może pobrać uprawnienia dla dowolnego użytkownika
     */
    @GetMapping("/user/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getUserFolderPermissions(@PathVariable Long userId) {
        Optional<User> userOpt = userService.findById(userId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found");
        }

        User user = userOpt.get();
        logger.info("Admin getting folder permissions for user: {}", user.getUsername());
        List<FolderPermission> permissions = folderPermissionService.getUserPermissions(user);

        List<Map<String, Object>> result = permissions.stream().map(permission -> {
            Map<String, Object> permMap = new HashMap<>();
            permMap.put("id", permission.getId());
            permMap.put("folderPath", permission.getFolderPath());
            permMap.put("userId", permission.getUser().getId());
            permMap.put("username", permission.getUser().getUsername());
            permMap.put("canRead", permission.isCanRead());
            permMap.put("canWrite", permission.isCanWrite());
            permMap.put("canDelete", permission.isCanDelete());
            permMap.put("includeSubfolders", permission.isIncludeSubfolders());
            return permMap;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    /**
     * Administrator może dodać uprawnienie do folderu dla dowolnego użytkownika
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> addFolderPermission(
            @RequestParam Long userId,
            @RequestParam String folderPath,
            @RequestParam(defaultValue = "true") boolean canRead,
            @RequestParam(defaultValue = "false") boolean canWrite,
            @RequestParam(defaultValue = "false") boolean canDelete,
            @RequestParam(defaultValue = "false") boolean includeSubfolders) {

        Optional<User> userOpt = userService.findById(userId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found");
        }

        User user = userOpt.get();
        logger.info("Adding folder permission for user {} to path {}", user.getUsername(), folderPath);

        try {
            FolderPermission permission = folderPermissionService.setPermission(
                    folderPath, user, canRead, canWrite, canDelete, includeSubfolders);

            Map<String, Object> result = new HashMap<>();
            result.put("id", permission.getId());
            result.put("folderPath", permission.getFolderPath());
            result.put("userId", permission.getUser().getId());
            result.put("username", permission.getUser().getUsername());
            result.put("canRead", permission.isCanRead());
            result.put("canWrite", permission.isCanWrite());
            result.put("canDelete", permission.isCanDelete());
            result.put("includeSubfolders", permission.isIncludeSubfolders());

            return ResponseEntity.status(HttpStatus.CREATED).body(result);
        } catch (Exception e) {
            logger.error("Error creating folder permission: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error creating folder permission: " + e.getMessage());
        }
    }

    /**
     * Administrator może usunąć uprawnienie do folderu
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> removeFolderPermission(@PathVariable Long id) {
        try {
            folderPermissionService.removePermission(id);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            logger.error("Error removing folder permission: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error removing folder permission: " + e.getMessage());
        }
    }

    // Add a new endpoint to FolderPermissionController
    @PostMapping("/product-folder")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> setProductFolder(
            @RequestParam String folderPath,
            @RequestParam boolean isProductFolder) {
        try {
            logger.info("Setting folder {} as product folder: {}", folderPath, isProductFolder);

            // Get permissions for this folder
            List<FolderPermission> permissions = folderPermissionService.getPermissionsForFolder(folderPath);

            // Update permission type for all users who have access to this folder
            for (FolderPermission permission : permissions) {
                permission.setPermissionType(isProductFolder ? "PRODUCT" : "STANDARD");
                folderPermissionService.savePermission(permission);
            }

            return ResponseEntity.ok().build();
        } catch (Exception e) {
            logger.error("Error setting product folder: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error setting product folder: " + e.getMessage());
        }
    }

    /**
     * Get list of folders marked as products
     */
    @GetMapping("/product-folders")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<String>> getProductFolders() {
        try {
            List<String> productFolders = folderPermissionService.getProductFolders();
            return ResponseEntity.ok(productFolders);
        } catch (Exception e) {
            logger.error("Error getting product folders: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    @PostMapping("/product-children-folder")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> setProductChildrenFolder(
            @RequestParam String folderPath,
            @RequestParam boolean hasChildrenAsProducts) {
        try {
            logger.info("Setting folder {} as folder with product children: {}", folderPath, hasChildrenAsProducts);

            // Get permissions for this folder
            List<FolderPermission> permissions = folderPermissionService.getPermissionsForFolder(folderPath);

            // If no permissions exist, create a default one
            if (permissions.isEmpty()) {
                // Create a new permission for the current user
                User currentUser = (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
                FolderPermission permission = new FolderPermission(
                        folderPath, currentUser, true, true, true, false,
                        hasChildrenAsProducts ? "CHILDREN_AS_PRODUCTS" : "STANDARD"
                );
                folderPermissionService.savePermission(permission);
            } else {
                // Update existing permissions
                for (FolderPermission permission : permissions) {
                    permission.setPermissionType(
                            hasChildrenAsProducts ? "CHILDREN_AS_PRODUCTS" : "STANDARD"
                    );
                    folderPermissionService.savePermission(permission);
                }
            }

            return ResponseEntity.ok().build();
        } catch (Exception e) {
            logger.error("Error setting product children folder: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error setting product children folder: " + e.getMessage());
        }
    }

}