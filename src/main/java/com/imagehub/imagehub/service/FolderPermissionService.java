package com.imagehub.imagehub.service;

import com.imagehub.imagehub.model.Folder;
import com.imagehub.imagehub.model.FolderPermission;
import com.imagehub.imagehub.model.User;
import com.imagehub.imagehub.repository.FolderPermissionRepository;
import com.imagehub.imagehub.repository.FolderRepository;
import com.imagehub.imagehub.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class FolderPermissionService {

    @Autowired
    private FolderPermissionRepository folderPermissionRepository;

    @Autowired
    private FolderRepository folderRepository;

    @Autowired
    private UserRepository userRepository;

    public FolderPermission assignPermission(Long folderId, Long userId, String permission) {
        Folder folder = folderRepository.findById(folderId)
                .orElseThrow(() -> new IllegalArgumentException("Folder not found"));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        // Szukamy czy już istnieje uprawnienie
        FolderPermission fp = folderPermissionRepository
                .findByFolderIdAndUserId(folderId, userId)
                .stream()
                .findFirst()
                .orElse(new FolderPermission());

        fp.setFolder(folder);
        fp.setUser(user);
        fp.setPermissionType(permission);

        return folderPermissionRepository.save(fp);
    }

    public boolean canViewFolder(Long folderId, Long userId) {
        // Pobieramy wszystkie uprawnienia użytkownika do tego folderu
        List<FolderPermission> perms = folderPermissionRepository.findByFolderIdAndUserId(folderId, userId);

        // Jeśli nie ma żadnych uprawnień, zwracamy false
        if (perms.isEmpty()) {
            return false;
        }

        // Jeśli wśród uprawnień jest READ, WRITE lub ADMIN – uznajemy, że może „widzieć” folder
        for (FolderPermission fp : perms) {
            String permissionType = fp.getPermissionType();
            if ("READ".equalsIgnoreCase(permissionType)
                    || "WRITE".equalsIgnoreCase(permissionType)
                    || "ADMIN".equalsIgnoreCase(permissionType)) {
                return true;
            }
        }

        // Jeśli żadna z powyższych wartości nie wystąpiła, zwracamy false
        return false;
    }

    public List<Folder> getFoldersUserCanView(Long userId) {
        // zakładam, że w folderPermissionRepository masz metodę:
        // findFoldersWithReadPermission(userId)
        // która zwraca foldery z uprawnieniami READ/WRITE/ADMIN
        return folderPermissionRepository.findFoldersWithReadPermission(userId);
    }
}
