package dev.ulloasp.mlsuite.schema.application.dto;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

import dev.ulloasp.mlsuite.schema.domain.model.SchemaModelBinding;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaVersion;

public record SchemaVersionDto(
        Long id,
        Long schemaId,
        int version,
        String name,
        Map<String, Object> formSchema,
        List<SchemaModelBindingDto> bindings,
        OffsetDateTime createdAt) {

    public static SchemaVersionDto from(SchemaVersion version, List<SchemaModelBinding> bindings) {
        return new SchemaVersionDto(
                version.getId(),
                version.getSchema().getId(),
                version.getVersion(),
                version.getName(),
                version.getFormSchema(),
                SchemaModelBindingDto.fromList(bindings),
                version.getCreatedAt());
    }
}
