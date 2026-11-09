package dev.ulloasp.mlsuite.schema.catalog;

import static dev.ulloasp.mlsuite.schema.catalog.InferenceCatalogValues.filled;
import static dev.ulloasp.mlsuite.schema.catalog.InferenceCatalogValues.first;
import static dev.ulloasp.mlsuite.schema.catalog.InferenceCatalogValues.list;
import static dev.ulloasp.mlsuite.schema.catalog.InferenceCatalogValues.records;
import static dev.ulloasp.mlsuite.schema.catalog.InferenceCatalogValues.target;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import dev.ulloasp.mlsuite.schema.application.dto.PredictionResultDto;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaModelBindingDto;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaVersionDto;
import dev.ulloasp.mlsuite.schema.application.service.PublicRunReports;

/** The reports a snapshot shows for one model result, read from the result's stored output. */
final class InferenceReportValues {

    private static final Set<String> BUILTINS = Set.of("classifier", "regressor");
    private static final Set<String> METADATA = Set.of("endpoint", "modelId", "backendUrl", "status");

    /**
     * @param column what tells the report's column apart among the model's outputs: the output it
     *        reads, followed by its stored id when an earlier report of the snapshot reads that output too
     */
    record Report(int order, String label, String kind, String column, Map<?, ?> config, Map<?, ?> payload) {
    }

    /** One model result with the reports it produced, derived once for a row's outputs and feedback. */
    record Produced(PredictionResultDto result, List<Report> reports) {
    }

    private InferenceReportValues() {
    }

    static boolean builtin(String kind) {
        return BUILTINS.contains(kind);
    }

    /**
     * A snapshot can show outputs and feedback only when every report says which model output it
     * reads: one output for every model, or one per model. The snapshot's validation accepts both.
     */
    static boolean executable(SchemaVersionDto version) {
        return version != null && records(version.formSchema().get("reports")).stream()
                .map(report -> report.get("mappedTo"))
                .allMatch(mapping -> mapping instanceof Map<?, ?> || InferenceCatalogValues.scalar(mapping));
    }

    static Produced produced(SchemaVersionDto version, PredictionResultDto result) {
        SchemaModelBindingDto binding = version.bindings().stream()
                .filter(item -> item.modelId().equals(result.modelId()))
                .findFirst()
                .orElse(null);
        List<Map<?, ?>> configs = records(version.formSchema().get("reports"));
        List<Map<?, ?>> outputs = records(result.output() == null ? null : result.output().get("reports"));
        List<Report> reports = new ArrayList<>();
        Set<String> routed = new HashSet<>();
        for (int order = 0; order < configs.size(); order++) {
            Map<?, ?> config = configs.get(order);
            String label = config.get("label") instanceof String text ? text : "";
            String route = target(config.get("mappedTo"), binding);
            if (label.isEmpty() || route == null || route.isEmpty()) {
                continue;
            }
            String kind = config.get("kind") instanceof String text ? text : "report";
            String storedId = PublicRunReports.storedId(config, order);
            // The first report on an output keeps the column the output always had.
            String column = routed.add(route) ? route : route + ":" + storedId;
            Map<?, ?> payload = PublicRunReports.storedCopy(outputs, storedId, route)
                    .map(copy -> relabel(config, copy))
                    .orElse(null);
            if (payload != null && (builtin(kind) || meaningful(payload))) {
                reports.add(new Report(order, label, kind, column, config, payload));
            }
        }
        return new Produced(result, reports);
    }

    /** A built-in report's predicted label or a regressor's value, or a custom report's text. */
    static Object value(Report report) {
        if (!builtin(report.kind())) {
            return String.join(" · ", InferenceReportText.content(report.payload()));
        }
        // A run stores a regressor's prediction as its list of values, one per predicted row.
        List<?> values = list(report.payload().get("values"));
        return first(report.payload().get("prediction"), values.isEmpty() ? null : values.get(0));
    }

    /** The class labels a report's configuration lists. */
    static List<String> configuredLabels(Object value) {
        return list(value).stream().filter(String.class::isInstance).map(String.class::cast).toList();
    }

    /**
     * A stored report as it is shown: a schema's class labels name the stored classes in order, so
     * the predicted class reads as the label in its place. The run page shows it the same way.
     */
    private static Map<?, ?> relabel(Map<?, ?> config, Map<?, ?> stored) {
        List<String> labels = configuredLabels(config.get("labels"));
        if (labels.isEmpty()) return stored;
        Map<Object, Object> shown = new LinkedHashMap<>(stored);
        int index = configuredLabels(stored.get("labels")).indexOf(String.valueOf(stored.get("prediction")));
        shown.put("labels", labels);
        if (index >= 0 && index < labels.size()) shown.put("prediction", labels.get(index));
        return shown;
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
}
