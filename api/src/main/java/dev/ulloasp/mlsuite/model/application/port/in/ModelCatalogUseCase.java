package dev.ulloasp.mlsuite.model.application.port.in;

import java.util.List;

import org.springframework.web.multipart.MultipartFile;

import dev.ulloasp.mlsuite.model.domain.model.Model;

public interface ModelCatalogUseCase {

    Model createModel(Long userId, String name, MultipartFile modelFile);

    List<Model> getModels(Long userId);
}
