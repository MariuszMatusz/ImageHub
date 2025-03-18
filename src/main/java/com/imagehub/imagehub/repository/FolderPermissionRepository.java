package com.imagehub.imagehub.repository;

import com.imagehub.imagehub.model.FolderPermission;
import com.imagehub.imagehub.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FolderPermissionRepository extends JpaRepository<FolderPermission, Long> {

    // Znajdź wszystkie uprawnienia dla danego użytkownika
    List<FolderPermission> findByUser(User user);

    // Znajdź uprawnienia dla konkretnego folderu i użytkownika
    Optional<FolderPermission> findByFolderPathAndUser(String folderPath, User user);

    // Znajdź wszystkie uprawnienia dla folderów z określoną ścieżką bazową (dla podfolderów)
    @Query("SELECT fp FROM FolderPermission fp WHERE fp.user = :user AND " +
            "(:folderPath LIKE CONCAT(fp.folderPath, '/%') OR :folderPath = fp.folderPath) AND " +
            "fp.includeSubfolders = true")
    List<FolderPermission> findRelevantPermissionsForPath(@Param("user") User user, @Param("folderPath") String folderPath);

    // Sprawdź czy istnieje uprawnienie do odczytu dla danego folderu
    @Query("SELECT CASE WHEN COUNT(fp) > 0 THEN true ELSE false END FROM FolderPermission fp " +
            "WHERE fp.user = :user AND fp.canRead = true AND " +
            "(:folderPath LIKE CONCAT(fp.folderPath, '/%') OR :folderPath = fp.folderPath) AND " +
            "(fp.includeSubfolders = true OR :folderPath = fp.folderPath)")
    boolean hasReadPermission(@Param("user") User user, @Param("folderPath") String folderPath);

    // Sprawdź czy istnieje uprawnienie do zapisu dla danego folderu
    @Query("SELECT CASE WHEN COUNT(fp) > 0 THEN true ELSE false END FROM FolderPermission fp " +
            "WHERE fp.user = :user AND fp.canWrite = true AND " +
            "(:folderPath LIKE CONCAT(fp.folderPath, '/%') OR :folderPath = fp.folderPath) AND " +
            "(fp.includeSubfolders = true OR :folderPath = fp.folderPath)")
    boolean hasWritePermission(@Param("user") User user, @Param("folderPath") String folderPath);

    // Sprawdź czy istnieje uprawnienie do usuwania dla danego folderu
    @Query("SELECT CASE WHEN COUNT(fp) > 0 THEN true ELSE false END FROM FolderPermission fp " +
            "WHERE fp.user = :user AND fp.canDelete = true AND " +
            "(:folderPath LIKE CONCAT(fp.folderPath, '/%') OR :folderPath = fp.folderPath) AND " +
            "(fp.includeSubfolders = true OR :folderPath = fp.folderPath)")
    boolean hasDeletePermission(@Param("user") User user, @Param("folderPath") String folderPath);

    // Znajdź wszystkie uprawnienia dla danego folderu
    List<FolderPermission> findByFolderPath(String folderPath);

    // Sprawdź czy istnieje uprawnienie dla danego folderu z określonym typem
    boolean existsByFolderPathAndPermissionType(String folderPath, String permissionType);

    // Znajdź wszystkie uprawnienia określonego typu
    List<FolderPermission> findByPermissionType(String permissionType);

}