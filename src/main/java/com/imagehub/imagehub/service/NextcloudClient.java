package com.imagehub.imagehub.service;

import com.github.sardine.Sardine;
import com.github.sardine.SardineFactory;
import com.github.sardine.DavResource;
import lombok.Getter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.List;

@Component
@Getter
public class NextcloudClient {
    private static final Logger logger = LoggerFactory.getLogger(NextcloudClient.class);

    private final String baseUrl;
    private final Sardine sardine;

    public NextcloudClient(String nextcloudUrl, String username, String password) {
        this.baseUrl = nextcloudUrl + "/remote.php/dav/files/" + username + "/";
        this.sardine = SardineFactory.begin(username, password);
        logger.info("🔹 Nextcloud client initialized for {}", nextcloudUrl);
    }

    /**
     * Enkoduje ścieżkę URL, zachowując strukturę ścieżki
     */
    private String encodePath(String path) {
        if (path == null || path.isEmpty()) {
            return "";
        }

        // Zakoduj każdy segment ścieżki oddzielnie
        String[] segments = path.split("/");
        StringBuilder encodedPath = new StringBuilder();

        for (String segment : segments) {
            if (!segment.isEmpty()) {
                // Koduj tylko jeśli segment nie jest pusty
                String encodedSegment = URLEncoder.encode(segment, StandardCharsets.UTF_8);
                // Zastąp '+' (kod dla spacji) znakiem '%20'
                encodedSegment = encodedSegment.replace("+", "%20");
                encodedPath.append(encodedSegment);
            }
            encodedPath.append("/");
        }

        // Usuń ostatni znak '/' jeśli nie był w oryginalnej ścieżce
        if (!path.endsWith("/") && encodedPath.length() > 0) {
            encodedPath.setLength(encodedPath.length() - 1);
        }

        return encodedPath.toString();
    }

    // Pobierz listę plików w katalogu
    public List<DavResource> listFiles(String remotePath) throws Exception {
        String encodedPath = encodePath(remotePath);
        logger.debug("Listing files at path: {} (encoded: {})", remotePath, encodedPath);

        try {
            return sardine.list(baseUrl + encodedPath);
        } catch (IOException e) {
            if (e.getMessage().contains("404")) {
                logger.warn("Ścieżka nie znaleziona (404): {}", remotePath);
                // Zwracamy pustą listę zamiast rzucania wyjątku
                return Collections.emptyList();
            }
            logger.error("Błąd podczas listowania plików w {}: {}", remotePath, e.getMessage());
            throw e;
        }
    }

    // Pobierz plik
    public InputStream downloadFile(String remotePath) throws Exception {
        String encodedPath = encodePath(remotePath);
        logger.debug("Downloading file: {} (encoded: {})", remotePath, encodedPath);

        try {
            return sardine.get(baseUrl + encodedPath);
        } catch (IOException e) {
            logger.error("Błąd podczas pobierania pliku {}: {}", remotePath, e.getMessage());
            throw e;
        }
    }

    // Wyślij plik
    public void uploadFile(String remotePath, byte[] data) throws Exception {
        String encodedPath = encodePath(remotePath);
        logger.debug("Uploading file to: {} (encoded: {})", remotePath, encodedPath);

        try {
            sardine.put(baseUrl + encodedPath, data);
        } catch (IOException e) {
            logger.error("Błąd podczas wysyłania pliku do {}: {}", remotePath, e.getMessage());
            throw e;
        }
    }

    /**
     * Utwórz katalog w Nextcloud
     * Obsługuje retry i sprawdzanie istnienia
     */
    public void createDirectory(String remotePath) throws Exception {
        String encodedPath = encodePath(remotePath);
        logger.debug("Creating directory: {} (encoded: {})", remotePath, encodedPath);

        int retryCount = 0;
        int maxRetries = 3;

        while (retryCount < maxRetries) {
            try {
                sardine.createDirectory(baseUrl + encodedPath);
                logger.info("Katalog utworzony pomyślnie: {}", remotePath);
                return;
            } catch (IOException e) {
                retryCount++;

                // Sprawdź czy katalog już istnieje
                if (exists(remotePath)) {
                    logger.info("Katalog {} już istnieje, pomijam tworzenie", remotePath);
                    return;
                }

                if (e.getMessage().contains("405")) {
                    logger.warn("Błąd 405 podczas tworzenia katalogu {} (próba {}/{}): {}",
                            remotePath, retryCount, maxRetries, e.getMessage());

                    if (retryCount < maxRetries) {
                        // Poczekaj przed ponowną próbą
                        Thread.sleep(1000);
                        continue;
                    }
                }

                logger.error("Błąd podczas tworzenia katalogu {}: {}", remotePath, e.getMessage());
                throw e;
            }
        }

        throw new IOException("Nie udało się utworzyć katalogu po " + maxRetries + " próbach: " + remotePath);
    }

    // Usuń plik lub katalog
    public void delete(String remotePath) throws Exception {
        String encodedPath = encodePath(remotePath);
        logger.debug("Deleting resource: {} (encoded: {})", remotePath, encodedPath);

        try {
            sardine.delete(baseUrl + encodedPath);
        } catch (IOException e) {
            logger.error("Błąd podczas usuwania zasobu {}: {}", remotePath, e.getMessage());
            throw e;
        }
    }

    // Sprawdź, czy zasób istnieje
    public boolean exists(String remotePath) {
        String encodedPath = encodePath(remotePath);
        try {
            return sardine.exists(baseUrl + encodedPath);
        } catch (IOException e) {
            logger.warn("Błąd podczas sprawdzania istnienia zasobu {}: {}", remotePath, e.getMessage());
            return false;
        }
    }
}



