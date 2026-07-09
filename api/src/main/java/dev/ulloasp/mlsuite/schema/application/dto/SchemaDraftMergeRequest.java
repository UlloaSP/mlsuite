package dev.ulloasp.mlsuite.schema.application.dto;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;

public record SchemaDraftMergeRequest(
        @NotNull Long expectedCurrentVersionId,
        @NotBlank String expectedCurrentDocumentHash,
        @NotNull Long expectedDraftRevision,
        @Valid @NotNull List<@NotNull @Valid SchemaDraftMergeResolutionDto> resolutions) {
}
