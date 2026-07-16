package dev.ulloasp.mlsuite.schema.application.dto;

import java.util.List;
import java.util.Comparator;
import java.util.LinkedHashMap;
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

    public static List<Map<String, Object>> toDraftBindings(List<SchemaModelBinding> bindings) {
        return fromList(bindings).stream()
                .sorted(Comparator.comparing(SchemaModelBindingDto::modelId))
                .map(binding -> {
                    Map<String, Object> result = new LinkedHashMap<>();
                    result.put("modelId", binding.modelId());
                    result.put("modelName", binding.modelName());
                    result.put("pluginPolicy", binding.pluginPolicy() == null ? Map.of() : binding.pluginPolicy());
                    return result;
                }).toList();
    }
}
