package dev.ulloasp.mlsuite.model.application.port.in;

import java.util.List;

import dev.ulloasp.mlsuite.model.application.dto.ModelDto;
import dev.ulloasp.mlsuite.model.application.upload.BundleInspection;
import dev.ulloasp.mlsuite.util.PageDto;
import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.storage.ArtifactSource;

public interface ModelCatalogUseCase {

    /** Refuses, before a bundle is read, a member who may not create models or a name already taken. */
    void requireCreatable(Long userId, String name);

    /** Stores the bundle the runtime read as a model of the member's organization. */
    /** Stores a model whose artifact is {@code artifact}, which {@code sha256} names; it is streamed, never held. */
    Model createModel(Long userId, String name, BundleInspection inspection, ArtifactSource artifact, String sha256,
            String contentType);

    List<Model> getModels(Long userId);

    Model getModel(Long userId, Long modelId);

    PageDto<ModelDto> getModelPage(Long userId, int page, int size, String search, String sort, String status);

    Model renameModel(Long userId, Long modelId, String name, Long expectedVersion);

    Model archiveModel(Long userId, Long modelId, Long expectedVersion);

    Model restoreModel(Long userId, Long modelId, Long expectedVersion);

    Model duplicateModel(Long userId, Long modelId, String name);

    void deleteModel(Long userId, Long modelId, Long expectedVersion);
}
