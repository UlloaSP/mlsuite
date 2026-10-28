package dev.ulloasp.mlsuite.model.application.upload;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * What the runtime read from an uploaded bundle: its model's kind and estimator, the file name it
 * reports, the schema and manifest it carries and, when the model has them, its importances.
 */
public record BundleInspection(String type, String specificType, String fileName, Map<String, Object> schema,
        Map<String, Object> manifest, List<Map<String, Object>> featureImportances) {

    /** Reads the runtime's answer; {@code uploadedName} names the file when the answer does not. */
    public static BundleInspection of(Map<String, Object> answer, String uploadedName) {
        List<Map<String, Object>> importances = answer.get("featureImportances") instanceof List<?> items
                ? items.stream().filter(Map.class::isInstance).map(item -> object((Map<?, ?>) item)).toList()
                : null;
        return new BundleInspection(text(answer, "type"), text(answer, "specificType"),
                answer.get("fileName") != null ? answer.get("fileName").toString() : uploadedName,
                required(answer, "schema"), required(answer, "manifest"), importances);
    }

    private static String text(Map<String, Object> answer, String key) {
        return answer.get(key) != null ? answer.get(key).toString() : null;
    }

    /** A JSON object the runtime must answer with; its absence is the runtime's fault, not the caller's. */
    private static Map<String, Object> required(Map<String, Object> answer, String key) {
        if (!(answer.get(key) instanceof Map<?, ?> value)) {
            throw new IllegalStateException("Analyzer answered without the model " + key);
        }
        return object(value);
    }

    private static Map<String, Object> object(Map<?, ?> value) {
        Map<String, Object> object = new LinkedHashMap<>();
        value.forEach((key, item) -> object.put(String.valueOf(key), item));
        return object;
    }
}
