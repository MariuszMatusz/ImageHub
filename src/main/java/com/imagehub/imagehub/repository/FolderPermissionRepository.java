package com.imagehub.imagehub.repository;

import com.imagehub.imagehub.model.Folder;
import com.imagehub.imagehub.model.FolderPermission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface FolderPermissionRepository extends JpaRepository<FolderPermission, Long> {
    // np. pobieranie uprawnień użytkownika do folderu
    List<FolderPermission> findByFolderIdAndUserId(Long folderId, Long userId);

    // Pobiera listę Folderów, do których user ma READ/WRITE/ADMIN
    @Query("""
       SELECT f 
       FROM FolderPermission fp 
            JOIN fp.folder f
       WHERE fp.user.id = :userId
         AND fp.permissionType IN ('READ','WRITE','ADMIN')
    """)
    List<Folder> findFoldersWithReadPermission(@Param("userId") Long userId);

    void deleteByFolder(Folder folder);
}

