package com.imagehub.imagehub.service;

import com.github.sardine.DavResource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
@EnableScheduling
public class NextcloudSyncService {
    private static final Logger logger = LoggerFactory.getLogger(NextcloudSyncService.class);

    private final NextcloudClient nextcloudClient;

    // Cache dla przechowywania struktury folderów
    private final Map<String, List<Map<String, Object>>> folderCache = new ConcurrentHashMap<>();
    private volatile long lastSyncTime = 0;
    private volatile boolean synchronizationInProgress = false;
    private volatile int consecutiveErrors = 0;
    private static final int MAX_CONSECUTIVE_ERRORS = 3;

    // Lista folderów, które powinny być ukryte
    private static final List<String> HIDDEN_FOLDERS = List.of("admin");

    @Autowired
    public NextcloudSyncService(NextcloudClient nextcloudClient) {
        this.nextcloudClient = nextcloudClient;
        logger.info("🔹 Usługa synchronizacji Nextcloud zainicjalizowana");
    }

    /**
     * Zaplanowane zadanie synchronizacji z Nextcloud co 15 sekund
     */
    @Scheduled(fixedRate = 15000) // 15 sekund w milisekundach
    public void scheduledSync() {
        // Jeśli synchronizacja jest już w trakcie lub było zbyt wiele błędów, pomijamy
        if (synchronizationInProgress) {
            logger.debug("Synchronizacja już w trakcie, pomijanie zaplanowanej synchronizacji");
            return;
        }

        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
            logger.warn("Zbyt wiele błędów synchronizacji ({} z rzędu). Ograniczanie częstotliwości synchronizacji.",
                    consecutiveErrors);

            // Resetuj licznik błędów co 5 minut (co 20 planowanych synchronizacji)
            if (System.currentTimeMillis() - lastSyncTime > 300000) {
                logger.info("Resetowanie licznika błędów i ponowna próba synchronizacji");
                consecutiveErrors = 0;
            } else {
                return;
            }
        }

        try {
            logger.debug("Uruchamianie zaplanowanej synchronizacji Nextcloud");
            synchronizeFolders();
            // Jeśli doszliśmy tutaj, synchronizacja była udana, resetujemy licznik błędów
            consecutiveErrors = 0;
        } catch (Exception e) {
            consecutiveErrors++;
            logger.error("Błąd podczas zaplanowanej synchronizacji Nextcloud (błąd {} z rzędu): {}",
                    consecutiveErrors, e.getMessage(), e);
        }
    }

    /**
     * Synchronizacja folderów z Nextcloud
     */
    public synchronized void synchronizeFolders() {
        if (synchronizationInProgress) {
            logger.warn("Synchronizacja już w trakcie, pomijanie żądania");
            return;
        }

        synchronizationInProgress = true;

        try {
            logger.info("Rozpoczęcie synchronizacji folderów Nextcloud");

            // Wyczyść bieżący cache
            folderCache.clear();

            // Pobierz strukturę root z Nextcloud
            try {
                synchronizeFolder("");
            } catch (Exception e) {
                logger.error("Błąd podczas synchronizacji folderu głównego: {}", e.getMessage());
            }

            // Dodatkowa weryfikacja - upewnij się, że folder "admin" nie jest w cache'u
            folderCache.getOrDefault("", List.of()).removeIf(resource ->
                    HIDDEN_FOLDERS.contains((String) resource.get("name")));

            // Aktualizacja czasu ostatniej synchronizacji
            lastSyncTime = System.currentTimeMillis();
            logger.info("Synchronizacja Nextcloud zakończona o {}", lastSyncTime);
        } catch (Exception e) {
            logger.error("Błąd podczas synchronizacji z Nextcloud: {}", e.getMessage(), e);
        } finally {
            synchronizationInProgress = false;
        }
    }

    /**
     * Rekurencyjnie synchronizuj folder i jego podfoldery
     */
    private void synchronizeFolder(String path) throws Exception {
        try {
            List<DavResource> resources = nextcloudClient.listFiles(path);

            // Konwertuj zasoby do formatu mapy i cache'uj je, filtrując ukryte foldery
            List<Map<String, Object>> resourceMaps = resources.stream()
                    .filter(resource -> !resource.getName().isEmpty())
                    .filter(resource -> !isHiddenResource(path, resource.getName()))
                    .map(resource -> {
                        Map<String, Object> resourceMap = new ConcurrentHashMap<>();
                        resourceMap.put("name", resource.getName());
                        resourceMap.put("isDirectory", resource.isDirectory());
                        resourceMap.put("contentType", resource.getContentType());
                        resourceMap.put("path", buildFullPath(path, resource.getName()));
                        resourceMap.put("lastModified", resource.getModified());
                        if (resource.getContentLength() > 0) {
                            resourceMap.put("contentLength", resource.getContentLength());
                        }
                        return resourceMap;
                    })
                    .collect(Collectors.toList());

            // Cache'uj zawartość tego folderu
            folderCache.put(path, resourceMaps);

            // Rekurencyjnie przetwarzaj podfoldery, ale tylko do określonej głębokości
            // aby uniknąć problemów z wydajnością
            int currentDepth = path.isEmpty() ? 0 : path.split("/").length;
            int maxDepth = 3; // Ograniczenie głębokości rekurencji

            if (currentDepth < maxDepth) {
                for (DavResource resource : resources) {
                    if (resource.isDirectory() && !resource.getName().isEmpty()) {
                        String resourceName = resource.getName();

                        // Pomijaj ukryte foldery i ich zawartość
                        if (isHiddenResource(path, resourceName)) {
                            logger.debug("Pomijanie ukrytego folderu: {}", resourceName);
                            continue;
                        }

                        String subPath = buildFullPath(path, resourceName);

                        try {
                            synchronizeFolder(subPath);
                        } catch (Exception e) {
                            logger.warn("Nie można zsynchronizować podfolderu {}: {}", subPath, e.getMessage());
                            // Kontynuuj synchronizację pozostałych folderów, nawet jeśli jeden z nich się nie powiedzie
                        }
                    }
                }
            }
        } catch (Exception e) {
            logger.error("Błąd podczas synchronizacji folderu {}: {}", path, e.getMessage());
            throw e; // Przekazywanie wyjątku do obsługi przez wyższą warstwę
        }
    }

    /**
     * Pobierz cache'owaną zawartość folderu, upewniając się, że ukryte foldery są filtrowane
     */
    public List<Map<String, Object>> getCachedFolderContents(String path) {
        List<Map<String, Object>> resources = folderCache.getOrDefault(path, List.of());

        // Dodatkowe filtrowanie na wypadek, gdyby ukryte foldery znalazły się w cache'u
        if (path.isEmpty()) {
            return resources.stream()
                    .filter(resource -> !HIDDEN_FOLDERS.contains((String) resource.get("name")))
                    .collect(Collectors.toList());
        }

        return resources;
    }

    /**
     * Sprawdź, czy ścieżka istnieje w cache
     */
    public boolean isPathCached(String path) {
        return folderCache.containsKey(path);
    }

    /**
     * Pobierz czas ostatniej synchronizacji
     */
    public long getLastSyncTime() {
        return lastSyncTime;
    }

    /**
     * Wymuś natychmiastową synchronizację
     */
    public void forceSynchronization() {
        // Unikaj wymuszania synchronizacji, jeśli było zbyt wiele błędów
        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
            logger.warn("Zbyt wiele błędów synchronizacji ({} z rzędu). Pomijanie wymuszonej synchronizacji.",
                    consecutiveErrors);
            return;
        }

        try {
            synchronizeFolders();
            // Jeśli doszliśmy tutaj, synchronizacja była udana, resetujemy licznik błędów
            consecutiveErrors = 0;
        } catch (Exception e) {
            consecutiveErrors++;
            logger.error("Błąd podczas wymuszonej synchronizacji (błąd {} z rzędu): {}",
                    consecutiveErrors, e.getMessage(), e);
        }
    }

    /**
     * Sprawdź, czy zasób jest ukryty (np. folder admin w katalogu głównym)
     */
    private boolean isHiddenResource(String parentPath, String resourceName) {
        // Ukryj folder "admin" w katalogu głównym
        if (parentPath.isEmpty() && HIDDEN_FOLDERS.contains(resourceName)) {
            return true;
        }
        return false;
    }

    /**
     * Zbuduj pełną ścieżkę z ścieżki rodzica i nazwy zasobu
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
     * Sprawdź, czy synchronizacja jest aktywna
     */
    public boolean isSynchronizationInProgress() {
        return synchronizationInProgress;
    }

    /**
     * Pobierz bieżący status synchronizacji
     */
    public Map<String, Object> getSyncStatus() {
        Map<String, Object> status = new HashMap<>();
        status.put("lastSyncTime", lastSyncTime);
        status.put("inProgress", synchronizationInProgress);
        status.put("consecutiveErrors", consecutiveErrors);
        status.put("cacheSize", folderCache.size());
        return status;
    }
}