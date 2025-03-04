package com.imagehub.imagehub.service;

import com.imagehub.imagehub.model.Folder;
import com.imagehub.imagehub.model.FolderPermission;
import com.imagehub.imagehub.model.Role;
import com.imagehub.imagehub.model.User;
import com.imagehub.imagehub.repository.FolderPermissionRepository;
import com.imagehub.imagehub.repository.FolderRepository;
import com.imagehub.imagehub.repository.UserRepository;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class FolderService {

    @Autowired
    private FolderRepository folderRepository;


    @Autowired
    private CloudStorageService cloudStorageService;
    // tu wstrzyknie się NextcloudStorageService albo inna implementacja

    @Autowired
    private FolderPermissionRepository folderPermissionRepository;

    @Value("${nextcloud.url}")
    private String nextcloudUrl;




    /**
     * Pobiera nazwę folderu z pełnej ścieżki
     * @param path Ścieżka np. "files/TestowyFolder"
     * @return "TestowyFolder"
     */
    private String extractFolderName(String path) {
        String[] parts = path.split("/");
        return parts[parts.length - 1]; // Pobiera ostatni segment ścieżki
    }

    public String normalizePath(String path) {
        if (path == null) {
            return null;
        }
        if (path.endsWith("/")) {
            path = path.substring(0, path.length() - 1);
        }
        String prefix = nextcloudUrl.endsWith("/") ? nextcloudUrl : nextcloudUrl + "/";
        if (path.startsWith(prefix)) {
            path = path.substring(prefix.length());
        }
        return path;
    }



    /**
     * Tworzy folder w Nextcloud (lub innej chmurze) oraz zapisuje w bazie
     */
    public Folder createFolder(Long parentFolderId, String folderName) throws IOException {
        Folder parent = null;

        // 1) Domyślnie używamy bazowego URL Nextclouda (np. "https://twoj-nextcloud/remote.php/dav/files/admin")
        String parentPathInCloud = nextcloudUrl;

        // 2) Jeśli jest folder nadrzędny (parentFolderId != null), pobierz go z bazy
        if (parentFolderId != null) {
            parent = folderRepository.findById(parentFolderId)
                    .orElseThrow(() -> new IllegalArgumentException("Parent folder not found!"));

            // Ten pathInCloud MUSI zawierać nazwę folderu nadrzędnego, np.
            // "https://twoj-nextcloud/remote.php/dav/files/admin/FolderRodzic"
            parentPathInCloud = parent.getPathInCloud();
        }

        // 3) Sklejamy ścieżkę do nowego folderu
        // Jeśli parentPathInCloud nie kończy się slashem, doklejamy "/"
        String newFolderPath = parentPathInCloud.endsWith("/")
                ? parentPathInCloud + folderName
                : parentPathInCloud + "/" + folderName;

        // 4) Tworzymy folder w Nextcloud (przez WebDAV)
        cloudStorageService.createFolder(parentPathInCloud, folderName);
        // UWAGA: powyższa metoda też może zwrócić newFolderPath, zależnie od implementacji.
        // Niektóre osoby wolą: `String newFolderPath = cloudStorageService.createFolder(parentPathInCloud, folderName);`

        // 5) Tworzymy obiekt Folder i zapisujemy do bazy
        Folder newFolder = new Folder();
        newFolder.setName(folderName);
        newFolder.setPathInCloud(newFolderPath);
        newFolder.setParentFolder(parent);
        newFolder.setFolderType("DEFAULT");

        return folderRepository.save(newFolder);
    }

    /**
     * Listuje foldery na podstawie ID folderu nadrzędnego.
     * Jeśli parentFolderId jest null, zwraca foldery bazowe.
     */
    public List<Folder> listFoldersByParent(Long parentFolderId) {
        if (parentFolderId == null) {
            // Przykładowo, możesz zwrócić wszystkie foldery bazowe, gdzie parentFolder == null
            return folderRepository.findByParentFolder_Id(null);
        } else {
            return folderRepository.findByParentFolder_Id(parentFolderId);
        }
    }

    /**
     * Usuwa folder – najpierw wywołuje usunięcie w chmurze, a następnie usuwa rekord z bazy.
     */
    public void deleteFolder(Long folderId) throws IOException {
        Folder folder = folderRepository.findById(folderId)
                .orElseThrow(() -> new IllegalArgumentException("Folder not found!"));
        // Usuwamy folder w Nextcloud
        cloudStorageService.deleteFolder(folder.getPathInCloud());
        // Usuwamy rekord z bazy
        folderRepository.delete(folder);
    }

    /**
     * Pobiera folder z bazy na podstawie ID.
     * @param id ID szukanego folderu.
     * @return Optional z folderem, jeśli istnieje; pusty Optional w przeciwnym wypadku.
     */
    public Optional<Folder> findById(Long id) {
        return folderRepository.findById(id);
    }

    @Scheduled(fixedRate = 1000)
    @Transactional
    public void syncNextcloudFolders() throws IOException {
        // Pobieramy listę folderów z Nextcloud
        List<String> cloudFolderPaths = cloudStorageService.listFolders(nextcloudUrl);

        // Normalizujemy pobrane ścieżki
        List<String> normalizedCloudPaths = cloudFolderPaths.stream()
                .map(this::normalizePath)
                .filter(Objects::nonNull)
                .distinct()  // zapobiega powtórzeniom w samej liście
                .collect(Collectors.toList());

        // Pobieramy foldery z bazy, które mają ustawioną ścieżkę (czyli te synchronizowane z Nextcloud)
        List<Folder> dbFolders = folderRepository.findAll().stream()
                .filter(folder -> folder.getPathInCloud() != null)
                .collect(Collectors.toList());

        // Usuń foldery, które nie znajdują się już w Nextcloud
        for (Folder folder : dbFolders) {
            String normalizedDbPath = normalizePath(folder.getPathInCloud());
            if (!normalizedCloudPaths.contains(normalizedDbPath)) {
                // Jeśli używasz kaskadowego usuwania w encji – wystarczy delete
                // Jeśli nie, musisz ręcznie usunąć powiązane rekordy (patrz poprzednie rozwiązania)
                folderPermissionRepository.deleteByFolder(folder);
                folderRepository.delete(folder);
            }
        }

        // Dodaj nowe foldery, których nie ma jeszcze w bazie
        for (String cloudPath : normalizedCloudPaths) {
            Optional<Folder> existingFolder = folderRepository.findByPathInCloud(cloudPath);
            if (existingFolder.isEmpty()) {
                Folder newFolder = new Folder();
                newFolder.setName(extractFolderName(cloudPath));
                newFolder.setPathInCloud(cloudPath);
                newFolder.setFolderType("DEFAULT");
                folderRepository.save(newFolder);
            }
        }
    }

    public List<Folder> getUniqueFolders() {
        List<Folder> folders = folderRepository.findAll();
        Map<String, Folder> uniqueFolders = new HashMap<>();
        for (Folder folder : folders) {
            String normalizedPath = normalizePath(folder.getPathInCloud());
            if (normalizedPath != null && !uniqueFolders.containsKey(normalizedPath)) {
                uniqueFolders.put(normalizedPath, folder);
            }
        }
        return new ArrayList<>(uniqueFolders.values());
    }





    /**
     * Zwraca wszystkie foldery.
     * Użyj tego endpointu w kontrolerze, aby ADMIN widział wszystkie foldery.
     */
    public List<Folder> getAllFolders() {
        return folderRepository.findAll();
    }

}


