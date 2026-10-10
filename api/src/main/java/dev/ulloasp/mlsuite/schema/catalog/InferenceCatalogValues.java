package dev.ulloasp.mlsuite.schema.catalog;

import java.util.List;
import java.util.Locale;
import java.util.Map;

import dev.ulloasp.mlsuite.schema.application.dto.SchemaModelBindingDto;

/** The display keys, mappings and value rules shared by persisted forms and run payloads. */
final class InferenceCatalogValues {

    private static final List<String> DISPLAY_KEYS = List.of("displayKey", "label", "id");

    private InferenceCatalogValues() {
    }

    static Map<?, ?> map(Object value) {
        return value instanceof Map<?, ?> entries ? entries : Map.of();
    }

    static List<?> list(Object value) {
        return value instanceof List<?> items ? items : List.of();
    }

    static List<Map<?, ?>> records(Object value) {
        return list(value).stream().filter(Map.class::isInstance).<Map<?, ?>>map(InferenceCatalogValues::map).toList();
    }

    static Object first(Object... values) {
        for (Object value : values) {
            if (value != null) {
                return value;
            }
        }
        return null;
    }

    /** A value worth a cell: anything but nothing and blank text. */
    static boolean filled(Object value) {
        return value != null && !(value instanceof String text && InferenceJsValues.blank(text));
    }

    /** The text itself when it says something, otherwise null. */
    static String nonBlank(Object value) {
        return value instanceof String text && !InferenceJsValues.blank(text) ? text : null;
    }

    /** A field's key in run inputs: its display key, else its label, else its id, skipping blank ones. */
    static String displayKey(Map<?, ?> field) {
        for (String key : DISPLAY_KEYS) {
            String value = nonBlank(field.get(key));
            if (value != null) {
                return value;
            }
        }
        return null;
    }

    /** Every model input or output a mapping can route to, each once. */
    static List<String> targets(Object mapping) {
        if (scalar(mapping)) {
            return List.of(InferenceJsValues.string(mapping));
        }
        return map(mapping).values().stream()
                .filter(InferenceCatalogValues::scalar)
                .map(InferenceJsValues::string)
                .distinct()
                .toList();
    }

    /**
     * Where a mapping routes one model: by its name or the shared default, then by its id. Without a
     * model the mapping only has a target when it routes to exactly one.
     */
    static String target(Object mapping, SchemaModelBindingDto binding) {
        if (binding == null) {
            List<String> targets = targets(mapping);
            return targets.size() == 1 ? targets.get(0) : null;
        }
        if (scalar(mapping)) {
            return InferenceJsValues.string(mapping);
        }
        Map<?, ?> routes = map(mapping);
        String name = binding.modelName();
        Object named = name == null || name.isEmpty() ? null : first(routes.get(name), routes.get("default"));
        Object target = first(named, routes.get(String.valueOf(binding.modelId())), routes.get("default"));
        return scalar(target) ? InferenceJsValues.string(target) : null;
    }

    /**
     * What the inferences table treats as a number: a number, or text that reads as one. Blank text is
     * not a number, and neither is anything else.
     */
    static double number(Object value) {
        if (value instanceof Number number) {
            return number.doubleValue();
        }
        return value instanceof String text && !InferenceJsValues.blank(text)
                ? InferenceJsValues.number(text)
                : Double.NaN;
    }

    /**
     * "Baseline · v3", or just "v3" when the snapshot is unnamed or named after its number, so labels
     * never read "v1 · v1".
     */
    static String snapshotLabel(String name, int version) {
        String number = "v" + version;
        String trimmed = name == null ? "" : InferenceJsValues.trim(name);
        return trimmed.isEmpty() || trimmed.toLowerCase(Locale.ROOT).equals(number)
                ? number
                : trimmed + " · " + number;
    }

    private static boolean scalar(Object value) {
        return value instanceof String || value instanceof Number;
    }
}
