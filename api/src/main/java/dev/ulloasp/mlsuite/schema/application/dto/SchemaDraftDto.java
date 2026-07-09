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
        Map<String, Object> formSchema,
        List<Map<String, Object>> bindings,
        long revision,
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
                draft.getFormSchema(),
                draft.getBindings(),
                draft.currentRevision(),
                draft.getStatus(),
                draft.getCreatedAt(),
                draft.getUpdatedAt());
    }
}
