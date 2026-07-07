package dev.ulloasp.mlsuite.schema.application.service;

import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

import org.springframework.stereotype.Service;

import dev.ulloasp.mlsuite.schema.application.dto.SchemaDraftChangeDto;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaDraftDiffDto;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaDraft;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaVersion;

@Service
public class SchemaDraftDiffService {

    public SchemaDraftDiffDto diff(SchemaDraft draft, SchemaVersion current) {
        Map<String, Object> baseValues = flatten(draft.getBaseVersion().getFormSchema());
        Map<String, Object> draftValues = flatten(draft.getFormSchema());
        Map<String, Object> currentValues = flatten(current.getFormSchema());

        Set<String> paths = new LinkedHashSet<>();
        paths.addAll(baseValues.keySet());
        paths.addAll(draftValues.keySet());
        paths.addAll(currentValues.keySet());

        List<SchemaDraftChangeDto> changes = paths.stream()
                .filter(path -> changed(baseValues, draftValues, currentValues, path))
                .map(path -> change(baseValues, draftValues, currentValues, path))
                .toList();

        return new SchemaDraftDiffDto(
                draft.getBaseVersion().getId(),
                current.getId(),
                changes.stream().anyMatch(SchemaDraftChangeDto::conflict),
                changes);
    }

    private boolean changed(Map<String, Object> base, Map<String, Object> draft,
            Map<String, Object> current, String path) {
        return !Objects.equals(base.get(path), draft.get(path))
                || !Objects.equals(base.get(path), current.get(path));
    }

    private SchemaDraftChangeDto change(Map<String, Object> base, Map<String, Object> draft,
            Map<String, Object> current, String path) {
        Object baseValue = base.get(path);
        Object draftValue = draft.get(path);
        Object currentValue = current.get(path);
        boolean draftChanged = !Objects.equals(baseValue, draftValue);
        boolean currentChanged = !Objects.equals(baseValue, currentValue);
        boolean conflict = draftChanged && currentChanged && !Objects.equals(draftValue, currentValue);
        return new SchemaDraftChangeDto(path, baseValue, draftValue, currentValue, conflict);
    }

    private Map<String, Object> flatten(Object value) {
        Map<String, Object> values = new LinkedHashMap<>();
        flattenInto("$", value, values);
        return values;
    }

    private void flattenInto(String path, Object value, Map<String, Object> values) {
        if (value instanceof Map<?, ?> map) {
            if (map.isEmpty()) values.put(path, Map.of());
            map.forEach((key, child) -> flattenInto(path + "." + key, child, values));
            return;
        }
        if (value instanceof List<?> list) {
            if (list.isEmpty()) values.put(path, List.of());
            for (int i = 0; i < list.size(); i++) {
                flattenInto(path + "[" + i + "]", list.get(i), values);
            }
            return;
        }
        values.put(path, value);
    }
}
