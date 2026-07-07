package dev.ulloasp.mlsuite.schema.application.dto;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

import dev.ulloasp.mlsuite.schema.domain.model.SchemaDraft;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaDraftStatus;

public record SchemaDraftDto(
        Long id,
        Long schemaId,
        Long baseVersionId,
        int baseVersion,
        String name,
        String bookmark,
        Map<String, Object> formSchema,
        List<Map<String, Object>> bindings,
        SchemaDraftStatus status,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt) {

    public static SchemaDraftDto from(SchemaDraft draft) {
        return new SchemaDraftDto(
                draft.getId(),
                draft.getSchema().getId(),
                draft.getBaseVersion().getId(),
                draft.getBaseVersion().getVersion(),
                draft.getName(),
                draft.getBookmark(),
                draft.getFormSchema(),
                draft.getBindings(),
                draft.getStatus(),
                draft.getCreatedAt(),
                draft.getUpdatedAt());
    }
}
