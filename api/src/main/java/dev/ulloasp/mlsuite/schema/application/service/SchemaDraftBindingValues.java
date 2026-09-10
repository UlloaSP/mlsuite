package dev.ulloasp.mlsuite.schema.application.service;

import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import dev.ulloasp.mlsuite.schema.application.dto.CreateSchemaModelBindingRequest;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaDraft;

final class SchemaDraftBindingValues {
    private SchemaDraftBindingValues() {}

    static List<CreateSchemaModelBindingRequest> requestBindings(SchemaDraft draft) {
        return draft.getBindings().stream().map(binding -> new CreateSchemaModelBindingRequest(
                modelId(binding.get("modelId")), pluginPolicy(binding.get("pluginPolicy")))).toList();
    }

    private static Long modelId(Object value) {
        if (value instanceof Number number) return number.longValue();
        if (value instanceof String text) try { return Long.valueOf(text); } catch (NumberFormatException ignored) { }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Draft binding modelId missing");
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> pluginPolicy(Object value) {
        return value instanceof Map<?, ?> ? (Map<String, Object>) value : Map.of();
    }

}
