package dev.ulloasp.mlsuite.schema.application.dto;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

import dev.ulloasp.mlsuite.schema.domain.model.Schema;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaVersion;
import dev.ulloasp.mlsuite.user.domain.model.User;

public record SchemaCatalogItemDto(
        Long id,
        Long organizationId,
        String name,
        String description,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        OffsetDateTime archivedAt,
        String updatedByName,
        String updatedByEmail,
        String updatedByAvatarUrl,
        long modelCount,
        long fieldCount,
        long reportCount) {

    public static SchemaCatalogItemDto from(Schema schema, SchemaVersion latestVersion, long modelCount) {
        Map<String, Object> formSchema = latestVersion == null ? Map.of() : latestVersion.getFormSchema();
        User modifier = schema.getUpdatedBy() == null ? schema.getCreatedBy() : schema.getUpdatedBy();
        return new SchemaCatalogItemDto(
                schema.getId(),
                schema.getOrganization().getId(),
                schema.getName(),
                schema.getDescription(),
                schema.getCreatedAt(),
                schema.getUpdatedAt(),
                schema.getArchivedAt(),
                modifier == null ? null : modifier.getFullName(),
                modifier == null ? null : modifier.getEmail(),
                modifier == null ? null : modifier.getAvatarUrl(),
                modelCount,
                countVisibleFields(formSchema),
                countReports(formSchema));
    }

    private static long countVisibleFields(Map<String, Object> formSchema) {
        Object fields = formSchema.get("fields");
        if (!(fields instanceof List<?> list)) return 0;
        return list.stream()
                .filter(Map.class::isInstance)
                .map(Map.class::cast)
                .filter(field -> !Boolean.TRUE.equals(field.get("hidden")))
                .count();
    }

    private static long countReports(Map<String, Object> formSchema) {
        Object reports = formSchema.get("reports");
        return reports instanceof List<?> list ? list.size() : 0;
    }
}
