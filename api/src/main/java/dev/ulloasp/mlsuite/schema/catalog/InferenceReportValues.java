package dev.ulloasp.mlsuite.schema.catalog;

import static dev.ulloasp.mlsuite.schema.catalog.InferenceCatalogValues.filled;
import static dev.ulloasp.mlsuite.schema.catalog.InferenceCatalogValues.first;
import static dev.ulloasp.mlsuite.schema.catalog.InferenceCatalogValues.list;
import static dev.ulloasp.mlsuite.schema.catalog.InferenceCatalogValues.map;
import static dev.ulloasp.mlsuite.schema.catalog.InferenceCatalogValues.records;
import static dev.ulloasp.mlsuite.schema.catalog.InferenceCatalogValues.target;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

import dev.ulloasp.mlsuite.schema.application.dto.PredictionResultDto;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaModelBindingDto;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaVersionDto;

/** The reports a snapshot shows for one model result, read from the result's stored output. */
final class InferenceReportValues {

    private static final Set<String> BUILTINS = Set.of("classifier", "regressor");
    private static final Set<String> METADATA = Set.of("endpoint", "modelId", "backendUrl", "status");
    private static final Pattern CLASS_INDEX = Pattern.compile("\\d+");

    record Report(int order, String label, String kind, String target, Map<?, ?> config, Map<?, ?> payload) {
    }

    /** One model result with the reports it produced, derived once for a row's outputs and feedback. */
    record Produced(PredictionResultDto result, List<Report> reports) {
    }

    private InferenceReportValues() {
    }

    static boolean builtin(String kind) {
        return BUILTINS.contains(kind);
    }

    /** A snapshot can show outputs and feedback only when every report says which model output it reads. */
    static boolean executable(SchemaVersionDto version) {
        return version != null && records(version.formSchema().get("reports")).stream()
                .allMatch(report -> report.get("mappedTo") instanceof Map<?, ?>);
    }

    static Produced produced(SchemaVersionDto version, PredictionResultDto result) {
        SchemaModelBindingDto binding = version.bindings().stream()
                .filter(item -> item.modelId().equals(result.modelId()))
                .findFirst()
                .orElse(null);
        List<Map<?, ?>> configs = records(version.formSchema().get("reports"));
        List<Map<?, ?>> outputs = records(result.output().get("reports"));
        List<Report> reports = new ArrayList<>();
        for (int order = 0; order < configs.size(); order++) {
            Map<?, ?> config = configs.get(order);
            String label = config.get("label") instanceof String text ? text : "";
            String route = target(config.get("mappedTo"), binding);
            if (label.isEmpty() || route == null || route.isEmpty()) {
                continue;
            }
            String kind = config.get("kind") instanceof String text ? text : "report";
            Map<?, ?> payload = payload(config, outputs, route, label);
            if (payload != null && (builtin(kind) || meaningful(payload))) {
                reports.add(new Report(order, label, kind, route, config, payload));
            }
        }
        return new Produced(result, reports);
    }

    /** A built-in report's predicted label, or a custom report's text. */
    static Object value(Report report) {
        return builtin(report.kind())
                ? first(report.payload().get("prediction"), report.payload().get("value"))
                : String.join(" · ", InferenceReportText.content(report.payload()));
    }

    /** The class labels a report's configuration lists. */
    static List<String> configuredLabels(Object value) {
        return list(value).stream().filter(String.class::isInstance).map(String.class::cast).toList();
    }

    /** Class labels from a model's own mapping: a list, or labels keyed by class index. */
    private static List<String> mappingLabels(Object value) {
        if (value instanceof List<?>) {
            return configuredLabels(value);
        }
        return map(value).entrySet().stream()
                .sorted(Comparator.comparingDouble(entry -> InferenceJsValues.number(String.valueOf(entry.getKey()))))
                .map(Map.Entry::getValue)
                .filter(String.class::isInstance)
                .map(String.class::cast)
                .toList();
    }

    private static Map<?, ?> payload(Map<?, ?> config, List<Map<?, ?>> outputs, String route, String label) {
        for (Map<?, ?> output : outputs) {
            String mappedTo = InferenceJsValues.string(output, "mappedTo");
            String id = InferenceJsValues.string(output, "id");
            if (route.equals(mappedTo) || label.equals(mappedTo) || label.equals(id)) {
                Object raw = output.containsKey("payload") ? output.get("payload") : output;
                return normalize(config, raw instanceof Map<?, ?> entries ? entries : singleton("value", raw));
            }
        }
        return null;
    }

    /** Shows a prediction given as a class index by its label, when the report or the model names its classes. */
    private static Map<?, ?> normalize(Map<?, ?> config, Map<?, ?> payload) {
        List<String> labels = configuredLabels(config.get("labels"));
        if (labels.isEmpty()) {
            labels = mappingLabels(payload.get("labels"));
        }
        if (labels.isEmpty()) {
            labels = mappingLabels(payload.get("mapping"));
        }
        if (labels.isEmpty()) {
            return payload;
        }
        Map<Object, Object> normalized = new LinkedHashMap<>(payload);
        normalized.put("labels", labels);
        Object prediction = payload.get("prediction");
        if (prediction instanceof String text && labels.contains(text)) {
            return normalized;
        }
        double index = -1;
        if (prediction instanceof Number number) {
            index = number.doubleValue();
        } else if (prediction instanceof String text && CLASS_INDEX.matcher(text).matches()) {
            index = InferenceJsValues.number(text);
        }
        if (index >= 0 && index == Math.rint(index) && index < labels.size()) {
            normalized.put("prediction", labels.get((int) index));
        }
        return normalized;
    }

    /** Whether a payload says anything beyond where it came from. */
    private static boolean meaningful(Object value) {
        if (value instanceof List<?> items) {
            for (Object item : items) {
                if (meaningful(item)) {
                    return true;
                }
            }
            return false;
        }
        if (value instanceof Map<?, ?> entries) {
            for (Map.Entry<?, ?> entry : entries.entrySet()) {
                if (!METADATA.contains(String.valueOf(entry.getKey())) && meaningful(entry.getValue())) {
                    return true;
                }
            }
            return false;
        }
        return filled(value);
    }

    private static Map<String, Object> singleton(String key, Object value) {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put(key, value);
        return values;
    }
}
