package dev.ulloasp.mlsuite.schema.application.dto;

import jakarta.validation.constraints.NotNull;

public record PublishSchemaDraftRequest(@NotNull Long expectedDraftRevision) {
}
