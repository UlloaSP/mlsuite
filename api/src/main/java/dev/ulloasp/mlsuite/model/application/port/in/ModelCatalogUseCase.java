package dev.ulloasp.mlsuite.model.application.port.in;

import java.util.List;

import org.springframework.web.multipart.MultipartFile;

import dev.ulloasp.mlsuite.model.application.dto.ModelPageDto;
import dev.ulloasp.mlsuite.model.domain.model.Model;

public interface ModelCatalogUseCase {

    Model createModel(Long userId, String name, MultipartFile modelFile);

    List<Model> getModels(Long userId);

    ModelPageDto getModelPage(Long userId, int page, int size, String search, String sort, String status);

    Model renameModel(Long userId, Long modelId, String name);

    Model archiveModel(Long userId, Long modelId);

    Model duplicateModel(Long userId, Long modelId, String name);

    void deleteModel(Long userId, Long modelId);
}
