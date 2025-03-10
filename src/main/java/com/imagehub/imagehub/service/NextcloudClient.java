package com.imagehub.imagehub.service;

import com.github.sardine.Sardine;
import com.github.sardine.SardineFactory;
import com.github.sardine.DavResource;
import lombok.Getter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.InputStream;
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

    // Pobierz listę plików w katalogu
    public List<DavResource> listFiles(String remotePath) throws Exception {
        logger.debug("Listing files at path: {}", remotePath);
        return sardine.list(baseUrl + remotePath);
    }

    // Pobierz plik
    public InputStream downloadFile(String remotePath) throws Exception {
        logger.debug("Downloading file: {}", remotePath);
        return sardine.get(baseUrl + remotePath);
    }

    // Wyślij plik
    public void uploadFile(String remotePath, byte[] data) throws Exception {
        logger.debug("Uploading file to: {}", remotePath);
        sardine.put(baseUrl + remotePath, data);
    }

    // Utwórz katalog
    public void createDirectory(String remotePath) throws Exception {
        logger.debug("Creating directory: {}", remotePath);
        sardine.createDirectory(baseUrl + remotePath);
    }

    // Usuń plik lub katalog
    public void delete(String remotePath) throws Exception {
        logger.debug("Deleting resource: {}", remotePath);
        sardine.delete(baseUrl + remotePath);
    }
}