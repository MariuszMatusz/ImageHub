package com.imagehub.imagehub.service;

import java.io.IOException;
import java.util.List;

public interface CloudStorageService {

    /**
     * Tworzy nowy folder (podany 'folderName') wewnątrz ścieżki 'parentPath'
     * i zwraca pełną ścieżkę utworzonego folderu.
     */
    String createFolder(String parentPath, String folderName) throws IOException;

    /**
     * Zwraca listę nazw (lub obiektów) subfolderów z danej ścieżki.
     */
    List<String> listFolders(String path) throws IOException;

    /**
     * Usuwa folder w danej ścieżce.
     */
    void deleteFolder(String path) throws IOException;


}
