package dev.ulloasp.mlsuite.schema.application.dto;

import java.util.List;

public record SchemaDraftDiffDto(
        Long baseVersionId,
        Long currentVersionId,
        String currentDocumentHash,
        boolean hasConflicts,
        List<SchemaDraftChangeDto> changes) {
}
