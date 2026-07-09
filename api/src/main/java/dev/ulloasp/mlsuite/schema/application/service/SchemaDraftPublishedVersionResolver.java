package dev.ulloasp.mlsuite.schema.application.service;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaVersionRepository;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaModelBindingDto;
import dev.ulloasp.mlsuite.schema.application.port.in.SchemaVersionUseCase;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaDraft;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaVersion;

@Service
public class SchemaDraftPublishedVersionResolver {
    private final SchemaVersionRepository versions;
    private final SchemaVersionUseCase versionUseCase;

    public SchemaDraftPublishedVersionResolver(SchemaVersionRepository versions,
            SchemaVersionUseCase versionUseCase) {
        this.versions = versions;
        this.versionUseCase = versionUseCase;
    }

    public SchemaVersion resolve(Long userId, SchemaDraft draft) {
        List<SchemaVersion> matches = versions.findBySchemaIdOrderByVersionDesc(draft.getSchema().getId()).stream()
                .filter(version -> Objects.equals(version.getName(), draft.getName()))
                .filter(version -> Objects.equals(version.getFormSchema(), draft.getFormSchema()))
                .filter(version -> sameBindings(draft.getBindings(),
                        SchemaModelBindingDto.toDraftBindings(versionUseCase.listBindings(userId, version.getId()))))
                .toList();
        if (matches.size() != 1) throw conflict("Published version unavailable");
        return matches.getFirst();
    }

    private boolean sameBindings(List<Map<String, Object>> left, List<Map<String, Object>> right) {
        return normalize(left).equals(normalize(right));
    }

    private List<Map<String, Object>> normalize(List<Map<String, Object>> bindings) {
        return bindings.stream()
                .map(binding -> {
                    Map<String, Object> result = new LinkedHashMap<>();
                    result.put("modelId", binding.get("modelId"));
                    result.put("pluginPolicy", binding.getOrDefault("pluginPolicy", Map.of()));
                    return result;
                })
                .sorted(Comparator.comparing(binding -> String.valueOf(binding.get("modelId"))))
                .toList();
    }

    private ResponseStatusException conflict(String message) {
        return new ResponseStatusException(HttpStatus.CONFLICT, message);
    }
}
