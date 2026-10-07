package dev.ulloasp.mlsuite.schema.application.service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Stream;

import dev.ulloasp.mlsuite.schema.domain.model.BoundModel;

/**
 * A snapshot's form as public pages receive it, together with the way back that only the server
 * holds. A stored form routes every input and report to models by name: {@code mappedTo} is a
 * feature, or a map from model to feature. The public form replaces each {@code mappedTo} with an
 * opaque key ({@code in0}, {@code out0}, ...) and expands each report once per model that produces
 * it. The keys follow from the stored form and its binding order, so nothing is persisted and the
 * form read by a page is the form its run is routed with.
 */
public final class PublicForm {

    private static final String FIELDS = "fields";
    private static final String REPORTS = "reports";
    private static final String MODEL_ROUTING = "mappedTo";
    private static final String DEFAULT_ROUTE = "default";
    /** Report keys that belong to the workspace: editor bookkeeping and the feedback workflow. */
    private static final Set<String> PRIVATE_REPORT_KEYS = Set.of(MODEL_ROUTING, "id", "source", "feedbackQuestionnaire");

    /** A public report and where its result comes from. */
    public record ReportRoute(String key, Long modelId, String kind) {
    }

    private final List<BoundModel> models;
    private final Map<String, Object> inputRoutes = new LinkedHashMap<>();
    private final List<ReportRoute> reportRoutes = new ArrayList<>();
    private final Map<String, Object> schema;
    private final int inputCount;

    private PublicForm(Map<String, Object> formSchema, List<BoundModel> models) {
        this.models = models;
        Map<String, Object> source = formSchema == null ? Map.of() : formSchema;
        List<?> storedFields = source.get(FIELDS) instanceof List<?> items ? items : List.of();
        Object reports = source.get(REPORTS) instanceof List<?> items ? reportsPerModel(items) : List.of();
        this.schema = Map.of(FIELDS, withInputKeys(storedFields), REPORTS, reports);
        this.inputCount = (int) storedFields.stream().filter(PublicForm::isShownField).count();
    }

    public static PublicForm of(Map<String, Object> formSchema, List<BoundModel> models) {
        return new PublicForm(formSchema, models);
    }

    /** {@code fields} and {@code reports} with no model identity and no feature name. */
    public Map<String, Object> schema() {
        return schema;
    }

    /** The inputs a visitor fills: a hidden field travels with the form but is never shown. */
    public int inputCount() {
        return inputCount;
    }

    /** The results a run shows: one per report and model that produces it. */
    public int reportCount() {
        return reportRoutes.size();
    }

    public Set<String> inputKeys() {
        return inputRoutes.keySet();
    }

    public List<ReportRoute> reportRoutes() {
        return reportRoutes;
    }

    /**
     * The record one model receives: each submitted value under the feature its input routes to.
     * Positional models read features by position, so numeric features come first in ascending
     * order, as the browser serializes the same record in the workspace.
     */
    public Map<String, Object> modelInput(BoundModel model, Map<String, Object> values) {
        Map<String, Object> routed = new LinkedHashMap<>();
        inputRoutes.forEach((key, mappedTo) -> {
            Object feature = featureFor(mappedTo, model);
            if (feature != null && values.containsKey(key)) routed.put(featureName(feature), values.get(key));
        });
        Map<String, Object> ordered = new LinkedHashMap<>();
        routed.keySet().stream().filter(PublicForm::isPosition)
                .sorted(Comparator.comparingLong(Long::parseLong))
                .forEach(position -> ordered.put(position, routed.get(position)));
        routed.forEach(ordered::putIfAbsent);
        return ordered;
    }

    /** Options of a field route to models too, so the key is replaced at every depth. */
    private Object withInputKeys(Object value) {
        if (value instanceof List<?> items) {
            return items.stream().map(this::withInputKeys).toList();
        }
        if (value instanceof Map<?, ?> entries) {
            Map<Object, Object> copy = new LinkedHashMap<>();
            entries.forEach((key, entry) -> {
                if (!MODEL_ROUTING.equals(key)) {
                    copy.put(key, withInputKeys(entry));
                } else if (isRouting(entry)) {
                    String inputKey = "in" + inputRoutes.size();
                    inputRoutes.put(inputKey, entry);
                    copy.put(key, inputKey);
                }
            });
            return copy;
        }
        return value;
    }

    private List<Object> reportsPerModel(List<?> reports) {
        return reports.stream().flatMap(report -> report instanceof Map<?, ?> config
                ? reportPerModel(config)
                : Stream.empty()).toList();
    }

    private Stream<Object> reportPerModel(Map<?, ?> report) {
        List<BoundModel> producers = models.stream()
                .filter(model -> featureFor(report.get(MODEL_ROUTING), model) != null)
                .toList();
        List<Object> expanded = new ArrayList<>();
        for (BoundModel model : producers) {
            String key = "out" + reportRoutes.size();
            reportRoutes.add(new ReportRoute(key, model.id(), String.valueOf(report.get("kind"))));
            Map<Object, Object> copy = new LinkedHashMap<>();
            report.forEach((name, value) -> {
                if (!PRIVATE_REPORT_KEYS.contains(name)) copy.put(name, value);
            });
            copy.put("id", key);
            copy.put(MODEL_ROUTING, key);
            // The workspace tells apart the copies of a report by model name; here they are numbered.
            if (producers.size() > 1 && report.get("label") instanceof String label) {
                copy.put("label", label + " " + (expanded.size() + 1));
            }
            expanded.add(copy);
        }
        return expanded.stream();
    }

    private static boolean isShownField(Object field) {
        return field instanceof Map<?, ?> config && !Boolean.TRUE.equals(config.get("hidden"));
    }

    /** MLForm's resolution: a bare target serves every model; a map is read by model name, then id. */
    private static Object featureFor(Object mappedTo, BoundModel model) {
        if (mappedTo instanceof String || mappedTo instanceof Number) return mappedTo;
        if (!(mappedTo instanceof Map<?, ?> routes)) return null;
        return Stream.of(model.name(), DEFAULT_ROUTE, String.valueOf(model.id()))
                .map(routes::get)
                .filter(target -> target instanceof String || target instanceof Number)
                .findFirst().orElse(null);
    }

    private static boolean isRouting(Object mappedTo) {
        return mappedTo instanceof String || mappedTo instanceof Number || mappedTo instanceof Map<?, ?>;
    }

    private static String featureName(Object feature) {
        return feature instanceof Number number && number.doubleValue() == Math.rint(number.doubleValue())
                ? String.valueOf(number.longValue())
                : String.valueOf(feature);
    }

    private static boolean isPosition(String feature) {
        return feature.matches("0|[1-9]\\d{0,17}");
    }
}
