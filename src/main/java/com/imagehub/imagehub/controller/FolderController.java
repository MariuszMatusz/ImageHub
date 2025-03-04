package com.imagehub.imagehub.controller;

import com.imagehub.imagehub.model.Folder;
import com.imagehub.imagehub.model.FolderPermission;
import com.imagehub.imagehub.model.Role;
import com.imagehub.imagehub.model.User;
import com.imagehub.imagehub.service.CloudStorageService;
import com.imagehub.imagehub.service.FolderPermissionService;
import com.imagehub.imagehub.service.FolderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/folders")
public class FolderController {

    @Autowired
    private FolderService folderService;
    
    @Autowired
    private FolderPermissionService folderPermissionService;
    
    @Autowired
    private CloudStorageService cloudStorageService;

    // ADMIN tworzy folder główny lub subfolder
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/create")
    public ResponseEntity<Folder> createFolder(
            @RequestParam(required = false) Long parentFolderId,
            @RequestParam String folderName) {
        try {
            Folder created = folderService.createFolder(parentFolderId, folderName);
            return ResponseEntity.ok(created);
        } catch (IOException e) {
            return ResponseEntity.internalServerError().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/{folderId}/permissions/{userId}")
    public ResponseEntity<FolderPermission> setPermission(
            @PathVariable Long folderId,
            @PathVariable Long userId,
            @RequestParam String permission) {
        FolderPermission fp = folderPermissionService.assignPermission(folderId, userId, permission);
        return ResponseEntity.ok(fp);
    }


    // ---------------------------
    // 3) Listowanie folderów w Nextcloud
    //    (po ścieżce WebDAV, np. ?path=https://twoj-nextcloud/remote.php/dav/files/admin)
    // ---------------------------
    @PreAuthorize("hasAnyRole('ADMIN','USER')")
    @GetMapping("/list")
    public ResponseEntity<List<String>> listFolders(@RequestParam String path) {
        try {
            // Bezpośrednie wywołanie CloudStorageService
            List<String> folders = cloudStorageService.listFolders(path);
            return ResponseEntity.ok(folders);
        } catch (IOException e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    // ---------------------------
    // 4) Usuwanie folderu w Nextcloud
    //    (po ścieżce WebDAV, np. ?path=https://twoj-nextcloud/remote.php/dav/files/admin/TestowyFolder)
    // ---------------------------
    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/delete")
    public ResponseEntity<Void> deleteFolderByPath(@RequestParam String path) {
        try {
            cloudStorageService.deleteFolder(path);
            return ResponseEntity.noContent().build();
        } catch (IOException e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    // ---------------------------
    // 5) Listowanie folderów z bazy (np. subfolderów)
    //    (po ID folderu nadrzędnego, np. ?parentFolderId=1)
    // ---------------------------
    @PreAuthorize("hasAnyRole('ADMIN','USER')")
    @GetMapping("/subfolders")
    public ResponseEntity<List<Folder>> listSubfolders(@RequestParam(required = false) Long parentFolderId) {
        List<Folder> folders = folderService.listFoldersByParent(parentFolderId);
        return ResponseEntity.ok(folders);
    }

    // ---------------------------
    // 6) Usuwanie folderu z bazy i z Nextcloud (po ID folderu)
    // ---------------------------
    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{folderId}")
    public ResponseEntity<Void> deleteFolderById(@PathVariable Long folderId) {
        try {
            folderService.deleteFolder(folderId);  // np. usuwa z Nextcloud i z bazy
            return ResponseEntity.noContent().build();
        } catch (IOException e) {
            return ResponseEntity.internalServerError().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PreAuthorize("hasAnyRole('ADMIN','USER')")
    @GetMapping("/{folderId}/view")
    public ResponseEntity<Folder> getFolderById(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long folderId) {

        boolean canView = folderPermissionService.canViewFolder(folderId, currentUser.getId());
        if (!canView) {
            // Brak uprawnień do widoku – zwracamy 403 Forbidden
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        // Posiada uprawnienia, więc zwracamy folder z bazy
        Folder folder = folderService.findById(folderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Folder not found"));
        return ResponseEntity.ok(folder);
    }


////    Wywołanie wszystkich folderów, do których user ma dostęp
//@PreAuthorize("hasAnyRole('ADMIN','USER')")
//@GetMapping("/my-folders")
//public ResponseEntity<List<Folder>> getMyFolders(@AuthenticationPrincipal User currentUser) {
//    List<Folder> accessibleFolders = folderPermissionService.getFoldersUserCanView(currentUser.getId());
//    return ResponseEntity.ok(accessibleFolders);
//}

@PreAuthorize("hasAnyRole('ADMIN','USER')")
@GetMapping("/my-folders")
public ResponseEntity<List<Folder>> getMyFolders(@AuthenticationPrincipal User currentUser) {
    List<Folder> accessibleFolders;

    // Sprawdzamy rolę użytkownika
    if (currentUser.getRole().equals(Role.ADMIN)) {
        // Dla ADMINa zwracamy wszystkie foldery, ale unikalne (bez duplikatów)
        accessibleFolders = folderService.getUniqueFolders();
    } else {
        // Dla USERa pobieramy foldery, do których ma dostęp
        accessibleFolders = folderPermissionService.getFoldersUserCanView(currentUser.getId());

        // Opcjonalnie usuwamy ewentualne duplikaty, używając normalizacji
        accessibleFolders = accessibleFolders.stream()
                .collect(Collectors.toMap(
                        folder -> folderService.normalizePath(folder.getPathInCloud()),
                        folder -> folder,
                        (existing, replacement) -> existing  // w przypadku duplikatów zostawiamy pierwszy napotkany
                ))
                .values().stream().collect(Collectors.toList());
    }

    return ResponseEntity.ok(accessibleFolders);
}



    @GetMapping("/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Folder>> getAllFolders() {
        List<Folder> folders = folderService.getAllFolders();
        return ResponseEntity.ok(folders);
    }


}
