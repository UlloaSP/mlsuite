package dev.ulloasp.mlsuite.schema.application.service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * The part of a stored run a visitor may read: one value per visible field of the snapshot, under
 * the key the form gives that field. A run's input data also holds every model's feature vector
 * under the models' own feature names; none of that is copied, only read to find a field's value.
 *
 * The lookup follows the run's Inputs tab in the workspace (the client's {@code input-display.ts}),
 * so what a member publishes is what they saw before marking the run.
 */
final class PublicExampleInputs {

    private static final String ONE_HOT = "onehot-category";

    private PublicExampleInputs() {
    }

    static Map<String, Object> of(Map<String, Object> formSchema, Map<String, Object> inputData) {
        Map<String, Object> inputs = new LinkedHashMap<>();
        if (formSchema == null || inputData == null || !(formSchema.get("fields") instanceof List<?> fields)) {
            return inputs;
        }
        for (Object item : fields) {
            if (!(item instanceof Map<?, ?> field) || Boolean.TRUE.equals(field.get("hidden"))) continue;
            String key = displayKey(field);
            Object value = key == null ? null : fieldValue(field, key, inputData);
            if (hasValue(value)) inputs.put(key, value);
        }
        return inputs;
    }

    private static String displayKey(Map<?, ?> field) {
        for (String name : List.of("displayKey", "label", "id")) {
            if (field.get(name) instanceof String text && !text.isBlank()) return text;
        }
        return null;
    }

    private static Object fieldValue(Map<?, ?> field, String key, Map<String, Object> inputData) {
        List<String> candidates = new ArrayList<>(List.of(key));
        candidates.addAll(mappedTargets(field.get("mappedTo")));
        for (String candidate : candidates) {
            if (hasValue(inputData.get(candidate))) return inputData.get(candidate);
        }
        if (!ONE_HOT.equals(field.get("kind")) || !(field.get("options") instanceof List<?> options)) return null;
        for (Object item : options) {
            if (!(item instanceof Map<?, ?> option)) continue;
            if (mappedTargets(option.get("mappedTo")).stream().anyMatch(target -> isActive(inputData.get(target)))) {
                return option.get("value") != null ? option.get("value") : option.get("label");
            }
        }
        return null;
    }

    /** A field routes to one feature name, or to one per model. */
    private static Set<String> mappedTargets(Object mappedTo) {
        Set<String> targets = new LinkedHashSet<>();
        if (mappedTo instanceof String || mappedTo instanceof Number) {
            targets.add(mappedTo.toString());
        } else if (mappedTo instanceof Map<?, ?> routes) {
            routes.values().stream()
                    .filter(target -> target instanceof String || target instanceof Number)
                    .forEach(target -> targets.add(target.toString()));
        }
        return targets;
    }

    private static boolean hasValue(Object value) {
        return value != null && !(value instanceof String text && text.isBlank());
    }

    private static boolean isActive(Object oneHot) {
        return Boolean.TRUE.equals(oneHot) || "1".equals(oneHot)
                || (oneHot instanceof Number number && number.doubleValue() == 1);
    }
}
