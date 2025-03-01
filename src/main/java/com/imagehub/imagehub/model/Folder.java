package com.imagehub.imagehub.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "folders")
public class Folder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Nazwa folderu wewnątrz aplikacji (np. "Kategoria", "Produkty" itp.)
     */
    @Column(nullable = false)
    private String name;

    /**
     * Ścieżka w chmurze (Nextcloud), np.
     * "https://twoj-host/remote.php/dav/files/admin/FolderGlowny/Podfolder"
     */
    private String pathInCloud;

    /**
     * Dodatkowy typ folderu, np. "GŁÓWNY", "PRODUKT", "PODKATEGORIA" itd.
     * Możesz także użyć Enum, np. FolderType.
     */
    private String folderType;

    /**
     * Folder nadrzędny (dla zagnieżdżonej struktury).
     * Jeśli folder nie ma parenta, jest to folder "główny".
     */
    @ManyToOne
    @JoinColumn(name = "parent_id")
    @JsonBackReference
    private Folder parentFolder;

    /**
     * Lista podfolderów, które mają ten folder jako nadrzędny.
     */
    @OneToMany(mappedBy = "parentFolder", cascade = CascadeType.ALL)
    @JsonBackReference
    private List<Folder> subfolders = new ArrayList<>();

    // -----------------------------------------------------
    // Konstruktory
    // -----------------------------------------------------
    public Folder() {
    }

    public Folder(String name, String pathInCloud, String folderType, Folder parentFolder) {
        this.name = name;
        this.pathInCloud = pathInCloud;
        this.folderType = folderType;
        this.parentFolder = parentFolder;
    }

    // -----------------------------------------------------
    // Gettery i settery
    // -----------------------------------------------------
    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getPathInCloud() {
        return pathInCloud;
    }

    public String getFolderType() {
        return folderType;
    }

    public Folder getParentFolder() {
        return parentFolder;
    }

    public List<Folder> getSubfolders() {
        return subfolders;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setPathInCloud(String pathInCloud) {
        this.pathInCloud = pathInCloud;
    }

    public void setFolderType(String folderType) {
        this.folderType = folderType;
    }

    public void setParentFolder(Folder parentFolder) {
        this.parentFolder = parentFolder;
    }

    public void setSubfolders(List<Folder> subfolders) {
        this.subfolders = subfolders;
    }
}
