package com.imagehub.imagehub.service;

import com.imagehub.imagehub.model.Folder;
import com.imagehub.imagehub.repository.FolderRepository;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.List;
import java.util.Optional;

@Service
public class FolderService {

    @Autowired
    private FolderRepository folderRepository;

    @Autowired
    private CloudStorageService cloudStorageService;
    // tu wstrzyknie się NextcloudStorageService albo inna implementacja

    @Value("${nextcloud.url}")
    private String nextcloudUrl;

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
}
