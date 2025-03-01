package com.imagehub.imagehub.service;

import com.github.sardine.Sardine;
import com.github.sardine.SardineFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class NextcloudStorageService implements CloudStorageService {

    private final Sardine sardine;

    // W pliku application.properties możesz umieścić:
    // nextcloud.url = https://twoj-host/remote.php/dav/files/nazwa_usera/
    // nextcloud.username = ...
    // nextcloud.password = ...
    @Value("${nextcloud.url}")
    private String baseUrl;

    public NextcloudStorageService(
            @Value("${nextcloud.username}") String ncUser,
            @Value("${nextcloud.password}") String ncPass) {
        sardine = SardineFactory.begin(ncUser, ncPass);
    }

    @Override
    public String createFolder(String parentPath, String folderName) throws IOException {
        // np. parentPath = "https://twoj-host/remote.php/dav/files/nazwa_usera/GłównyKatalog"
        // Tworzymy nową ścieżkę
        String newFolderPath = parentPath.endsWith("/")
                ? parentPath + folderName
                : parentPath + "/" + folderName;

        sardine.createDirectory(newFolderPath);
        return newFolderPath;
    }

    @Override
    public List<String> listFolders(String path) throws IOException {
        return sardine.list(path).stream()
                // odfiltrowujemy np. pliki i bierzemy tylko katalogi
                .filter(res -> res.isDirectory())
                .map(res -> res.getName())
                .collect(Collectors.toList());
    }

    @Override
    public void deleteFolder(String path) throws IOException {
        sardine.delete(path);
    }
}
