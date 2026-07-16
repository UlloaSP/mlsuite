package dev.ulloasp.mlsuite.schema.application.port.in;

import java.util.List;

import dev.ulloasp.mlsuite.schema.application.dto.CreateSchemaDraftRequest;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaDraftDiffDto;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaDraftMergeRequest;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaDraftMergeResultDto;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaDraftPublishResultDto;
import dev.ulloasp.mlsuite.schema.application.dto.UpdateSchemaDraftRequest;
import dev.ulloasp.mlsuite.schema.application.dto.PublishSchemaDraftRequest;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaDraft;

public interface SchemaDraftUseCase {
    List<SchemaDraft> listDrafts(Long userId, Long schemaId);

    SchemaDraft createDraft(Long userId, Long schemaId, CreateSchemaDraftRequest request);

    SchemaDraft getDraft(Long userId, Long draftId);

    SchemaDraft updateDraft(Long userId, Long draftId, UpdateSchemaDraftRequest request);

    SchemaDraftDiffDto diffDraft(Long userId, Long draftId);

    SchemaDraftMergeResultDto mergeDraft(Long userId, Long draftId, SchemaDraftMergeRequest request);

    SchemaDraftPublishResultDto publishDraft(Long userId, Long draftId, PublishSchemaDraftRequest request);
}
