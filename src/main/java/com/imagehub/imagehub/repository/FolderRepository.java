package com.imagehub.imagehub.repository;

import com.imagehub.imagehub.model.Folder;
import com.imagehub.imagehub.model.FolderPermission;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface FolderRepository extends JpaRepository<Folder, Long> {
    // Ewentualne dodatkowe metody np. wyszukiwanie po parentFolder
    List<Folder> findByParentFolder_Id(Long parentId);
}

