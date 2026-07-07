package dev.ulloasp.mlsuite.schema.application.port.in;

import java.util.List;

import dev.ulloasp.mlsuite.schema.application.dto.CreateSchemaDraftRequest;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaDraftDiffDto;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaDraftPublishResultDto;
import dev.ulloasp.mlsuite.schema.application.dto.UpdateSchemaDraftRequest;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaDraft;

public interface SchemaDraftUseCase {
    List<SchemaDraft> listDrafts(Long userId, Long schemaId);

    SchemaDraft createDraft(Long userId, Long schemaId, CreateSchemaDraftRequest request);

    SchemaDraft getDraft(Long userId, Long draftId);

    SchemaDraft updateDraft(Long userId, Long draftId, UpdateSchemaDraftRequest request);

    SchemaDraftDiffDto diffDraft(Long userId, Long draftId);

    SchemaDraftPublishResultDto publishDraft(Long userId, Long draftId);
}
