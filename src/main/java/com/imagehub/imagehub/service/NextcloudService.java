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
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.stream.Collectors;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Service
public class NextcloudService {
    private static final Logger logger = LoggerFactory.getLogger(NextcloudService.class);

    private final NextcloudClient nextcloudClient;
    private final FolderPermissionService folderPermissionService;
    private final NextcloudSyncService nextcloudSyncService;

    @Autowired
    public NextcloudService(NextcloudClient nextcloudClient,
                            FolderPermissionService folderPermissionService,
                            NextcloudSyncService nextcloudSyncService) {
        this.nextcloudClient = nextcloudClient;
        this.folderPermissionService = folderPermissionService;
        this.nextcloudSyncService = nextcloudSyncService;
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

        List<Map<String, Object>> result = new ArrayList<>();

        // Sprawdź, czy obecny folder jest oznaczony jako mający dzieci jako produkty
        boolean currentFolderHasChildrenAsProducts = folderPermissionService.hasChildrenAsProducts(path);

        // Próbuj pobrać dane z cache'a
        if (nextcloudSyncService.isPathCached(path)) {
            logger.info("Using cached data for path: {}", path);
            List<Map<String, Object>> cachedResources = nextcloudSyncService.getCachedFolderContents(path);

            for (Map<String, Object> resource : cachedResources) {
                String resourcePath = (String) resource.get("path");
                String resourceName = (String) resource.get("name");

                // Przetwarzaj tylko jeśli to nie jest bieżący folder i użytkownik ma uprawnienia
                boolean isNotCurrentFolder = !resourcePath.equals(path);
                boolean userHasReadPermission = folderPermissionService.canUserReadFolder(currentUser, resourcePath);

                // Sprawdź dodatkowo, czy nazwa zasobu nie jest taka sama jak ostatni segment ścieżki
                String lastPathSegment = extractLastPathSegment(path);
                boolean isNotSameNameAsCurrentFolder = !resourceName.equals(lastPathSegment);

                if (isNotCurrentFolder && userHasReadPermission) {
                    // Dodaj informacje o uprawnieniach
                    resource.put("canWrite", folderPermissionService.canUserWriteFolder(currentUser, resourcePath));
                    resource.put("canDelete", folderPermissionService.canUserDeleteFolder(currentUser, resourcePath));

                    boolean isDirectory = (Boolean) resource.get("isDirectory");

                    // Sprawdź, czy to folder ma oznaczenie "dzieci jako produkty"
                    boolean resourceHasChildrenAsProducts = false;
                    if (isDirectory) {
                        resourceHasChildrenAsProducts = folderPermissionService.hasChildrenAsProducts(resourcePath);
                        resource.put("hasChildrenAsProducts", resourceHasChildrenAsProducts);
                    }

                    // Oznacz folder jako produkt, jeśli jego rodzic ma dzieci jako produkty,
                    // ALE NIE jeśli sam ma oznaczenie "dzieci jako produkty"
                    if (isDirectory) {
                        if (currentFolderHasChildrenAsProducts && !resourceHasChildrenAsProducts) {
                            resource.put("isProductFolder", true);
                        } else {
                            // Sprawdź, czy jest dzieckiem innego folderu z "dziećmi-produktami"
                            // ale tylko jeśli sam nie ma oznaczenia "dzieci-produkty"
                            if (!resourceHasChildrenAsProducts && folderPermissionService.isChildOfFolderWithProductChildren(resourcePath)) {
                                resource.put("isProductFolder", true);
                            } else {
                                resource.put("isProductFolder", false);
                            }
                        }
                    } else {
                        resource.put("isProductFolder", false);
                    }

                    // Obsługa dzieci rekurencyjnie
                    if (includeChildren && isDirectory && depth > 0) {
                        try {
                            List<Map<String, Object>> children = listFilesWithChildren(resourcePath, includeChildren, depth - 1, currentUser);
                            if (!children.isEmpty()) {
                                resource.put("children", children);
                            }
                        } catch (Exception e) {
                            logger.warn("Error listing contents of subfolder {}: {}", resourcePath, e.getMessage());
                        }
                    }

                    result.add(resource);
                } else {
                    if (resourcePath.equals(path)) {
                        logger.debug("Skipping current folder {} in listing", resourcePath);
                    } else {
                        logger.debug("User {} has no read permission for {}, skipping", currentUser.getUsername(), resourcePath);
                    }
                }
            }

            return result;
        }

        // Jeśli dane nie są dostępne w cache'u, pobierz je bezpośrednio z Nextcloud
        List<DavResource> resources = nextcloudClient.listFiles(path);
        logger.info("Received {} resources from Nextcloud for path {}", resources.size(), path);

        for (int i = 0; i < resources.size(); i++) {
            DavResource resource = resources.get(i);
            var skipping = i == 0 && path.isEmpty() && resource.getName().equals("");
            var isEmpty = resource.getName().isEmpty();
            var skipAdminDirectory = path.isEmpty() && resource.getName().equals("admin");

            // Sprawdź czy to nie jest bieżący folder
            var isCurrentFolder = false;
            if (!path.isEmpty()) {
                String resourceFullPath = buildFullPath(path, resource.getName());
                isCurrentFolder = path.equals(resourceFullPath);
            }

            // Sprawdź dodatkowo, czy nazwa zasobu nie jest taka sama jak ostatni segment ścieżki
            String lastPathSegment = extractLastPathSegment(path);
            boolean isNotSameNameAsCurrentFolder = !resource.getName().equals(lastPathSegment);

            boolean shouldIncludeResource = !skipping && !skipAdminDirectory && !isEmpty && !isCurrentFolder;

            if (shouldIncludeResource) {
                String resourcePath = buildFullPath(path, resource.getName());

                // Dodaj zasób tylko jeśli użytkownik ma uprawnienia
                if (folderPermissionService.canUserReadFolder(currentUser, resourcePath)) {
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

                    boolean isDirectory = resource.isDirectory();

                    // Sprawdź, czy ten folder ma oznaczenie "dzieci jako produkty"
                    boolean resourceHasChildrenAsProducts = false;
                    if (isDirectory) {
                        resourceHasChildrenAsProducts = folderPermissionService.hasChildrenAsProducts(resourcePath);
                        fileInfo.put("hasChildrenAsProducts", resourceHasChildrenAsProducts);
                    }

                    // Oznacz folder jako produkt, jeśli jego rodzic ma dzieci jako produkty,
                    // ALE NIE jeśli sam ma oznaczenie "dzieci jako produkty"
                    if (isDirectory) {
                        if (currentFolderHasChildrenAsProducts && !resourceHasChildrenAsProducts) {
                            fileInfo.put("isProductFolder", true);
                        } else {
                            // Sprawdź, czy jest dzieckiem innego folderu z "dziećmi-produktami"
                            // ale tylko jeśli sam nie ma oznaczenia "dzieci-produkty"
                            if (!resourceHasChildrenAsProducts && folderPermissionService.isChildOfFolderWithProductChildren(resourcePath)) {
                                fileInfo.put("isProductFolder", true);
                            } else {
                                fileInfo.put("isProductFolder", false);
                            }
                        }
                    } else {
                        fileInfo.put("isProductFolder", false);
                    }

                    // Obsługa dzieci rekurencyjnie
                    if (includeChildren && isDirectory && depth > 0 && !resource.getName().isEmpty()) {
                        try {
                            logger.info("Recursively listing files in subfolder: {}", resourcePath);
                            List<Map<String, Object>> children = listFilesWithChildren(resourcePath, includeChildren, depth - 1, currentUser);
                            if (!children.isEmpty()) {
                                fileInfo.put("children", children);
                            }
                        } catch (Exception e) {
                            logger.warn("Error listing contents of subfolder {}: {}", resource.getName(), e.getMessage());
                        }
                    }

                    // Dodaj do wyniku
                    result.add(fileInfo);
                } else {
                    logger.debug("User {} has no read permission for {}, skipping", currentUser.getUsername(), resourcePath);
                }
            }
        }

        logger.info("Returning {} entries for path {}", result.size(), path);
        return result;
    }

    /**
     * Pomocnicza metoda do wyodrębnienia ostatniego segmentu ścieżki
     */
    private String extractLastPathSegment(String path) {
        if (path == null || path.isEmpty()) {
            return "";
        }

        // Usuń końcowy znak "/" jeśli istnieje
        String normalizedPath = path.endsWith("/") ? path.substring(0, path.length() - 1) : path;

        int lastSlashIndex = normalizedPath.lastIndexOf('/');
        if (lastSlashIndex == -1) {
            return normalizedPath; // Cała ścieżka jest ostatnim segmentem
        }

        return normalizedPath.substring(lastSlashIndex + 1);
    }

    /**
     * Lista tylko tych folderów, do których użytkownik ma dostęp
     */
    public List<Map<String, Object>> listAccessibleFolders(User currentUser) throws Exception {
        // Dla admina pobieramy wszystkie foldery
        if (currentUser.getRole() != null && "ADMIN".equals(currentUser.getRole().getName())) {
            return listFiles("", currentUser);
        }

        // Folder główny "my-folders"
        Map<String, Object> myFoldersRoot = new HashMap<>();
        myFoldersRoot.put("name", "my-folders");
        myFoldersRoot.put("path", "my-folders");
        myFoldersRoot.put("isDirectory", true);

        // Pobierz uprawnienia użytkownika
        List<Map<String, Object>> userFolders = new ArrayList<>();
        Map<String, Map<String, Object>> folderMap = new HashMap<>(); // Mapa do śledzenia już dodanych folderów

        List<FolderPermission> permissions = folderPermissionService.getUserPermissions(currentUser);

        // Dla każdego uprawnienia próbujemy pobrać informacje o folderze
        for (FolderPermission permission : permissions) {
            if (permission.isCanRead()) {
                try {
                    String folderPath = permission.getFolderPath();

                    // Sprawdź, czy folder już został dodany
                    if (folderMap.containsKey(folderPath)) {
                        continue;
                    }

                    // Pobierz informacje o folderze z Nextcloud, ale bez filtrowania właśnie tego folderu
                    List<Map<String, Object>> folderContents = listFilesWithChildren(folderPath, false, 0, currentUser);

                    // Utwórz wpis dla folderu głównego, biorąc pierwszy element jeśli istnieje
                    Map<String, Object> mainFolder = null;
                    for (Map<String, Object> item : folderContents) {
                        if (folderPath.equals(item.get("path"))) {
                            mainFolder = item;
                            break;
                        }
                    }

                    // Jeśli nie znaleziono dokładnego dopasowania, utwórz nowy wpis dla folderu
                    if (mainFolder == null) {
                        mainFolder = new HashMap<>();
                        mainFolder.put("name", extractLastPathSegment(folderPath));
                        mainFolder.put("path", folderPath);
                        mainFolder.put("isDirectory", true);
                        mainFolder.put("canWrite", folderPermissionService.canUserWriteFolder(currentUser, folderPath));
                        mainFolder.put("canDelete", folderPermissionService.canUserDeleteFolder(currentUser, folderPath));
                    }

                    // Pobierz podfoldery w osobnym wywołaniu (z odpowiednią głębokością)
                    List<Map<String, Object>> subfolders = listFilesWithChildren(folderPath, true, 2, currentUser);

                    // Filtruj podfoldery, aby uniknąć duplikacji głównego folderu
                    List<Map<String, Object>> filteredSubfolders = new ArrayList<>();
                    for (Map<String, Object> subfolder : subfolders) {
                        String subfolderPath = (String) subfolder.get("path");
                        if (!subfolderPath.equals(folderPath)) {
                            filteredSubfolders.add(subfolder);
                        }
                    }

                    // Dodaj podfoldery do głównego folderu
                    if (!filteredSubfolders.isEmpty()) {
                        mainFolder.put("children", filteredSubfolders);
                    }

                    // Dodaj folder do listy i do mapy śledzenia
                    userFolders.add(mainFolder);
                    folderMap.put(folderPath, mainFolder);

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
        // Sprawdź uprawnienia do pobierania
        if (!folderPermissionService.canUserDownloadFolder(currentUser, path)) {
            logger.warn("User {} attempted to download file {} without permission", currentUser.getUsername(), path);
            throw new SecurityException("No download permission for this file");
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
//    /**
//     * Pobierz plik z uwzględnieniem uprawnień użytkownika
//     */
//    public byte[] downloadFile(String path, User currentUser) throws Exception {
//        // Sprawdź uprawnienia do odczytu
//        if (!folderPermissionService.canUserReadFolder(currentUser, path)) {
//            logger.warn("User {} attempted to download file {} without permission", currentUser.getUsername(), path);
//            throw new SecurityException("No read permission for this file");
//        }
//
//        logger.info("Downloading file: {}", path);
//        InputStream is = nextcloudClient.downloadFile(path);
//        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
//
//        int nRead;
//        byte[] data = new byte[16384];
//
//        while ((nRead = is.read(data, 0, data.length)) != -1) {
//            buffer.write(data, 0, nRead);
//        }
//
//        buffer.flush();
//        return buffer.toByteArray();
//    }

    /**
     * Tworzy plik zip z folderu
     */
    public byte[] createZipFromFolder(String folderPath, User currentUser) throws Exception {
        // Sprawdź uprawnienia
        if (!folderPermissionService.canUserReadFolder(currentUser, folderPath)) {
            throw new SecurityException("Brak uprawnień do odczytu tego folderu");
        }

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (ZipOutputStream zos = new ZipOutputStream(baos)) {
            // Rekurencyjnie dodaj pliki do zipa
            addFolderToZip(zos, folderPath, extractLastPathSegment(folderPath), currentUser);
        }

        return baos.toByteArray();
    }

    private void addFolderToZip(ZipOutputStream zos, String folderPath,
                                String zipPath, User currentUser) throws Exception {
        List<Map<String, Object>> contents = listFilesWithChildren(folderPath, false, 0, currentUser);

        for (Map<String, Object> item : contents) {
            String itemPath = (String) item.get("path");
            String itemName = (String) item.get("name");
            boolean isDirectory = (Boolean) item.get("isDirectory");

            String entryPath = zipPath + "/" + itemName;

            if (isDirectory) {
                // Utwórz wpis dla katalogu
                ZipEntry entry = new ZipEntry(entryPath + "/");
                zos.putNextEntry(entry);
                zos.closeEntry();

                // Rekurencyjnie dodaj zawartość katalogu
                addFolderToZip(zos, itemPath, entryPath, currentUser);
            } else {
                // Dodaj plik do zipa
                ZipEntry entry = new ZipEntry(entryPath);
                zos.putNextEntry(entry);

                // Pobierz zawartość pliku i zapisz do zipa
                byte[] fileContent = downloadFile(itemPath, currentUser);
                zos.write(fileContent);
                zos.closeEntry();
            }
        }
    }

    /**
     * Tworzy plik ZIP zawierający wiele plików i folderów
     *
     * @param paths Lista ścieżek do plików i folderów, które mają być dodane do ZIP
     * @param currentUser Aktualny użytkownik
     * @return Dane pliku ZIP jako tablica bajtów
     * @throws Exception W przypadku błędu
     */
    public byte[] createZipFromMultiplePaths(List<String> paths, User currentUser) throws Exception {
        logger.info("Tworzenie pliku ZIP z {} elementów dla użytkownika: {}", paths.size(), currentUser.getUsername());

        try (ByteArrayOutputStream baos = new ByteArrayOutputStream();
             ZipOutputStream zipOut = new ZipOutputStream(baos)) {

            // Ustaw poziom kompresji
            zipOut.setLevel(ZipOutputStream.DEFLATED);

            // Dodaj każdy plik/folder do archiwum ZIP
            for (String path : paths) {
                if (path == null || path.isEmpty()) {
                    continue;
                }

                // Ustal nazwę pliku/folderu z pełnej ścieżki
                String itemName = extractLastPathSegment(path);
                logger.debug("Dodawanie elementu: {} (ścieżka: {}) do ZIP", itemName, path);

                // Sprawdź, czy to plik czy folder
                // Możemy użyć metody listFiles aby sprawdzić, czy to folder
                boolean isDirectory = false;
                try {
                    // Próbujemy listować pliki - jeśli się uda, to znaczy, że to folder
                    listFiles(path, currentUser);
                    isDirectory = true;
                } catch (Exception e) {
                    // Jeśli się nie uda listować, to prawdopodobnie to plik
                    isDirectory = false;
                }

                if (isDirectory) {
                    // Dodaj folder i jego zawartość rekurencyjnie
                    addFolderToZip(zipOut, path, itemName, currentUser);
                } else {
                    // Dodaj pojedynczy plik do zipa
                    ZipEntry entry = new ZipEntry(itemName);
                    zipOut.putNextEntry(entry);

                    // Pobierz zawartość pliku i zapisz do zipa
                    byte[] fileContent = downloadFile(path, currentUser);
                    zipOut.write(fileContent);
                    zipOut.closeEntry();

                    logger.debug("Dodano plik do ZIP: {}", itemName);
                }
            }

            // Zamknij strumień ZIP i zwróć dane
            zipOut.flush();
            zipOut.close();

            logger.info("Pomyślnie utworzono ZIP z {} elementów, rozmiar: {} bajtów",
                    paths.size(), baos.size());

            return baos.toByteArray();
        } catch (Exception e) {
            logger.error("Błąd podczas tworzenia ZIP z wielu elementów: {}", e.getMessage(), e);
            throw e;
        }
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

        // Po dodaniu pliku, wymuś synchronizację
        nextcloudSyncService.forceSynchronization();
    }

    /**
     * Utwórz katalog z uwzględnieniem uprawnień użytkownika
     * Metoda rekurencyjnie tworzy całą ścieżkę katalogów
     */
    public void createDirectory(String path, User currentUser) throws Exception {
        // Sprawdź uprawnienia do zapisu w folderze nadrzędnym
        String parentPath = extractParentPath(path);
        if (!folderPermissionService.canUserWriteFolder(currentUser, parentPath)) {
            logger.warn("User {} attempted to create directory {} without permission", currentUser.getUsername(), path);
            throw new SecurityException("No write permission for parent folder");
        }

        logger.info("Creating directory: {}", path);

        // Sprawdź czy ścieżka jest pusta
        if (path == null || path.isEmpty()) {
            logger.warn("Attempted to create directory with empty path");
            throw new IllegalArgumentException("Directory path cannot be empty");
        }

        // Rozdziel ścieżkę na segmenty
        String[] segments = path.split("/");
        StringBuilder currentPath = new StringBuilder();

        // Rekurencyjnie twórz każdy segment ścieżki
        for (String segment : segments) {
            if (!segment.isEmpty()) {
                if (currentPath.length() > 0) {
                    currentPath.append("/");
                }
                currentPath.append(segment);

                String segmentPath = currentPath.toString();

                // Sprawdź, czy katalog już istnieje
                if (!nextcloudClient.exists(segmentPath)) {
                    try {
                        nextcloudClient.createDirectory(segmentPath);
                        logger.info("Created directory segment: {}", segmentPath);
                    } catch (Exception e) {
                        if (e.getMessage().contains("405") && nextcloudClient.exists(segmentPath)) {
                            // Katalog prawdopodobnie już istnieje - ignoruj błąd
                            logger.debug("Directory segment already exists (despite 405 error): {}", segmentPath);
                        } else {
                            logger.error("Error creating directory segment {}: {}", segmentPath, e.getMessage(), e);
                            throw new Exception("Nie można utworzyć katalogu " + segmentPath + ": " + e.getMessage(), e);
                        }
                    }
                } else {
                    logger.debug("Directory segment already exists: {}", segmentPath);
                }
            }
        }

        // Po utworzeniu katalogu, wymuś synchronizację
        nextcloudSyncService.forceSynchronization();
    }

    /**
     * Usuń zasób z uwzględnieniem uprawnień użytkownika
     */
    public void delete(String path, User currentUser) throws Exception {

        // Sprawdź uprawnienia do usuwania
        logger.info("1");
        if (!folderPermissionService.canUserDeleteFolder(currentUser, path)) {
            logger.warn("User {} attempted to delete resource {} without permission", currentUser.getUsername(), path);
            throw new SecurityException("No delete permission for this resource");
        }
        logger.info("2");
        logger.info("Deleting resource: {}", path);
        nextcloudClient.delete(path);

        // Po usunięciu zasobu, wymuś synchronizację
        nextcloudSyncService.forceSynchronization();
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

    /**
     * Wymuś synchronizację z Nextcloud
     */
    public void forceSynchronization() {
        nextcloudSyncService.forceSynchronization();
    }

    /**
     * Pobierz czas ostatniej synchronizacji
     */
    public long getLastSynchronizationTime() {
        return nextcloudSyncService.getLastSyncTime();
    }

    /**
     * Wyszukuje pliki i foldery w Nextcloud na podstawie zapytania
     *
     * @param query Tekst do wyszukania
     * @param currentUser Aktualny użytkownik
     * @return Lista pasujących elementów z informacjami
     * @throws Exception W przypadku błędu komunikacji z Nextcloud
     */
    public List<Map<String, Object>> searchFiles(String query, User currentUser) throws Exception {
        logger.info("Searching for files matching query: '{}' for user: {}",
                query, currentUser.getUsername());

        List<Map<String, Object>> searchResults = new ArrayList<>();

        try {
            // Określ ścieżkę startową w zależności od roli użytkownika
            String startPath = (currentUser.getRole() != null && "ADMIN".equals(currentUser.getRole().getName())) ? "" : "";

            // Pobierz wszystkie pliki i foldery, rekurencyjnie przeszukując całą strukturę
            // Uwaga: Dla dużych systemów plików to może być kosztowne, warto zoptymalizować
            searchInPath(startPath, query, currentUser, searchResults, new HashSet<>());

            logger.info("Search completed, found {} results", searchResults.size());
            return searchResults;
        } catch (Exception e) {
            logger.error("Error during file search: {}", e.getMessage(), e);
            throw e;
        }
    }

    /**
     * Rekurencyjnie przeszukuje ścieżkę w poszukiwaniu plików i folderów pasujących do zapytania
     *
     * @param path Ścieżka do przeszukania
     * @param query Zapytanie wyszukiwania
     * @param currentUser Aktualny użytkownik
     * @param results Lista wyników do uzupełnienia
     * @param visitedPaths Zbiór już odwiedzonych ścieżek (zapobiega zapętleniu)
     * @throws Exception W przypadku błędu komunikacji z Nextcloud
     */
    private void searchInPath(String path, String query, User currentUser,
                              List<Map<String, Object>> results, Set<String> visitedPaths) throws Exception {
        // Zapobiegaj zapętleniu przez śledzenie odwiedzonych ścieżek
        if (visitedPaths.contains(path)) {
            return;
        }
        visitedPaths.add(path);

        // Pobierz zawartość bieżącego folderu
        List<Map<String, Object>> folderContent;

        // Najpierw spróbuj pobrać dane z cache'a
        if (nextcloudSyncService.isPathCached(path)) {
            folderContent = nextcloudSyncService.getCachedFolderContents(path);
        } else {
            // Jeśli nie są w cache'u, pobierz bezpośrednio z Nextcloud
            List<DavResource> resources = nextcloudClient.listFiles(path);
            folderContent = convertResourcesToFileInfoList(resources, path, currentUser);
        }

        // Przeszukaj zawartość bieżącego folderu
        for (Map<String, Object> item : folderContent) {
            String itemPath = (String) item.get("path");
            String itemName = (String) item.get("name");
            boolean isDirectory = (boolean) item.get("isDirectory");

            // Sprawdź uprawnienia użytkownika do odczytu tego elementu
            if (!folderPermissionService.canUserReadFolder(currentUser, itemPath)) {
                continue;
            }

            // Sprawdź czy nazwa pasuje do zapytania (nie uwzględniając wielkości liter)
            if (itemName.toLowerCase().contains(query.toLowerCase())) {
                // Dodaj informacje o uprawnieniach
                item.put("canWrite", folderPermissionService.canUserWriteFolder(currentUser, itemPath));
                item.put("canDelete", folderPermissionService.canUserDeleteFolder(currentUser, itemPath));

                // Dodaj do wyników
                results.add(item);
            }

            // Jeśli to folder, rekurencyjnie przeszukaj jego zawartość
            if (isDirectory) {
                searchInPath(itemPath, query, currentUser, results, visitedPaths);
            }
        }
    }

    /**
     * Konwertuje listę DavResource na listę map z informacjami o plikach
     *
     * @param resources Lista zasobów z Nextcloud
     * @param parentPath Ścieżka rodzica
     * @param currentUser Aktualny użytkownik
     * @return Lista map z informacjami o plikach
     */
    private List<Map<String, Object>> convertResourcesToFileInfoList(
            List<DavResource> resources, String parentPath, User currentUser) {
        List<Map<String, Object>> result = new ArrayList<>();

        for (DavResource resource : resources) {
            // Pomijamy pierwszy element (bieżący folder) i puste nazwy
            if (resource.getName().isEmpty()) {
                continue;
            }

            // Budujemy pełną ścieżkę
            String resourcePath = buildFullPath(parentPath, resource.getName());

            // Sprawdzamy uprawnienia
            if (!folderPermissionService.canUserReadFolder(currentUser, resourcePath)) {
                continue;
            }

            Map<String, Object> fileInfo = new HashMap<>();
            fileInfo.put("name", resource.getName());
            fileInfo.put("path", resourcePath);
            fileInfo.put("isDirectory", resource.isDirectory());
            fileInfo.put("contentType", resource.getContentType());
            fileInfo.put("contentLength", resource.getContentLength());
            fileInfo.put("lastModified", resource.getModified());

            // Dodajemy do wyniku
            result.add(fileInfo);
        }

        return result;
    }

    /**
     * Pobiera informacje o produkcie z folderu produktowego
     *
     * @param folderPath Ścieżka do folderu produktowego
     * @param currentUser Aktualny użytkownik
     * @return Mapa z informacjami o produkcie
     * @throws Exception W przypadku błędu podczas pobierania danych
     */
    public Map<String, Object> getProductInfo(String folderPath, User currentUser) throws Exception {
        logger.info("Pobieranie informacji o produkcie dla folderu: {}", folderPath);

        // Sprawdź uprawnienia
        if (!folderPermissionService.canUserReadFolder(currentUser, folderPath)) {
            throw new SecurityException("Brak uprawnień do odczytu tego folderu");
        }

        // Utwórz podstawową mapę produktu
        Map<String, Object> productInfo = new HashMap<>();

        // Ustaw nazwę produktu - ostatni segment ścieżki
        String productName = extractLastPathSegment(folderPath);
        productInfo.put("name", productName);

        // Pobierz wszystkie pliki w folderze
        List<Map<String, Object>> files = listFilesWithChildren(folderPath, false, 0, currentUser);

        // Przygotuj mapę do przechowywania typów dostępnych plików
        Map<String, String> availableFiles = new HashMap<>();
        List<String> imageTypes = new ArrayList<>();

        // Sprawdź dostępne pliki i ich typy
        for (Map<String, Object> file : files) {
            if (!(Boolean) file.getOrDefault("isDirectory", false)) {
                String fileName = (String) file.get("name");
                String filePath = (String) file.get("path");

                // Klasyfikuj pliki według ich typów
                if (fileName.toLowerCase().contains("detail") && fileName.toLowerCase().endsWith(".jpg")) {
                    availableFiles.put("Detail_JPG", filePath);
                    imageTypes.add("Detail_JPG");
                } else if (fileName.toLowerCase().contains("detail") && fileName.toLowerCase().endsWith(".png")) {
                    availableFiles.put("Detail_PNG", filePath);
                    imageTypes.add("Detail_PNG");
                } else if (fileName.toLowerCase().contains("360") && fileName.toLowerCase().endsWith(".png")) {
                    availableFiles.put("360_PNG", filePath);
                    imageTypes.add("360_PNG");
                } else if (fileName.toLowerCase().contains("full") && fileName.toLowerCase().endsWith(".jpg")) {
                    availableFiles.put("FULL_JPG", filePath);
                    imageTypes.add("FULL_JPG");
                } else if (fileName.toLowerCase().contains("full") && fileName.toLowerCase().endsWith(".png")) {
                    availableFiles.put("FULL_PNG", filePath);
                    imageTypes.add("FULL_PNG");
                } else if (fileName.toLowerCase().contains("info") && fileName.toLowerCase().endsWith(".txt")) {
                    // Spróbuj odczytać informacje o produkcie z pliku tekstowego
                    try {
                        byte[] infoContent = downloadFile(filePath, currentUser);
                        String infoText = new String(infoContent, StandardCharsets.UTF_8);

                        // Przetwarzanie informacji z pliku tekstowego
                        Scanner scanner = new Scanner(infoText);
                        while (scanner.hasNextLine()) {
                            String line = scanner.nextLine();
                            if (line.startsWith("SKU:")) {
                                productInfo.put("sku", line.substring(4).trim());
                            } else if (line.startsWith("Name:")) {
                                // Nadpisz nazwę jeśli jest dostępna w pliku
                                productInfo.put("name", line.substring(5).trim());
                            }
                            // Dodaj więcej pól według potrzeb
                        }
                        scanner.close();
                    } catch (Exception e) {
                        logger.warn("Błąd odczytu pliku informacyjnego produktu: {}", e.getMessage());
                    }
                }
            }
        }

        // Dodaj dostępne typy plików do obiektu produktu
        productInfo.put("availableFiles", availableFiles);
        productInfo.put("imageTypes", imageTypes);

        // Domyślne SKU jeśli nie znaleziono w pliku info
        if (!productInfo.containsKey("sku")) {
            productInfo.put("sku", "KRASD32SD2332322");
        }

        // Dodaj ścieżkę produktu
        productInfo.put("path", folderPath);

        return productInfo;
    }
}