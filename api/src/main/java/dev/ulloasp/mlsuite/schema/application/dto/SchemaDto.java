package dev.ulloasp.mlsuite.schema.application.dto;

import java.time.OffsetDateTime;
import java.util.List;

import dev.ulloasp.mlsuite.schema.domain.model.Schema;

public record SchemaDto(
        Long id,
        Long organizationId,
        String name,
        String description,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt) {

    public static SchemaDto from(Schema schema) {
        return new SchemaDto(
                schema.getId(),
                schema.getOrganization().getId(),
                schema.getName(),
                schema.getDescription(),
                schema.getCreatedAt(),
                schema.getUpdatedAt());
    }

    public static List<SchemaDto> fromList(List<Schema> schemas) {
        return schemas.stream().map(SchemaDto::from).toList();
    }
}
