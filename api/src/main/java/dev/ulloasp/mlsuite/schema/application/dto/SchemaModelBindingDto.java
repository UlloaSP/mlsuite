package dev.ulloasp.mlsuite.schema.application.dto;

import java.util.List;
import java.util.Map;

import dev.ulloasp.mlsuite.schema.domain.model.SchemaModelBinding;

public record SchemaModelBindingDto(
        Long id,
        Long schemaVersionId,
        Long modelId,
        String modelName,
        Map<String, Object> pluginPolicy) {

    public static SchemaModelBindingDto from(SchemaModelBinding binding) {
        return new SchemaModelBindingDto(
                binding.getId(),
                binding.getSchemaVersion().getId(),
                binding.getModel().getId(),
                binding.getModel().getName(),
                binding.getPluginPolicy());
    }

    public static List<SchemaModelBindingDto> fromList(List<SchemaModelBinding> bindings) {
        return bindings.stream().map(SchemaModelBindingDto::from).toList();
    }
}
