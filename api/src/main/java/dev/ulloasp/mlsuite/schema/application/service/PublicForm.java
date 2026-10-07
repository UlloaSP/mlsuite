package dev.ulloasp.mlsuite.schema.application.service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
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
 *
 * A {@code hidden} field never leaves the server. MLForm, which runs the form in the workspace,
 * leaves a hidden field out of a run unless the field says {@code inactiveFieldPolicy: "include"},
 * and then submits its {@code defaultValue}. A public run does the same here: the value the schema
 * holds is routed to the models, and a visitor can neither read it nor replace it.
 */
public final class PublicForm {

    private static final String FIELDS = "fields";
    private static final String REPORTS = "reports";
    private static final String MODEL_ROUTING = "mappedTo";
    private static final String DEFAULT_ROUTE = "default";
    private static final String STORED_VALUE = "defaultValue";
    private static final String ONE_HOT = "onehot-category";
    /** Report keys that belong to the workspace: editor bookkeeping and the feedback workflow. */
    private static final Set<String> PRIVATE_REPORT_KEYS = Set.of(MODEL_ROUTING, "id", "source", "feedbackQuestionnaire");

    /** A public report and where its result comes from. */
    public record ReportRoute(String key, Long modelId, String kind) {
    }

    /** A value of a run and where it goes: a visitor's, sent under {@code key}, or the schema's own. */
    private record InputRoute(Object mappedTo, String key, Object stored) {
    }

    private final List<BoundModel> models;
    /** In the order of the stored form, which is the order a run's values are routed in. */
    private final List<InputRoute> inputRoutes = new ArrayList<>();
    private final Set<String> inputKeys = new LinkedHashSet<>();
    private final List<ReportRoute> reportRoutes = new ArrayList<>();
    private final Map<String, Object> schema;
    private final int inputCount;

    private PublicForm(Map<String, Object> formSchema, List<BoundModel> models) {
        this.models = models;
        Map<String, Object> source = formSchema == null ? Map.of() : formSchema;
        List<?> storedFields = source.get(FIELDS) instanceof List<?> items ? items : List.of();
        Object reports = source.get(REPORTS) instanceof List<?> items ? reportsPerModel(items) : List.of();
        List<Object> shownFields = new ArrayList<>();
        for (Object field : storedFields) {
            if (field instanceof Map<?, ?> config && Boolean.TRUE.equals(config.get("hidden"))) {
                routeStoredValue(config);
            } else {
                shownFields.add(withInputKeys(field));
            }
        }
        this.schema = Map.of(FIELDS, Collections.unmodifiableList(shownFields), REPORTS, reports);
        this.inputCount = (int) storedFields.stream().filter(PublicForm::isShownField).count();
    }

    public static PublicForm of(Map<String, Object> formSchema, List<BoundModel> models) {
        return new PublicForm(formSchema, models);
    }

    /** {@code fields} and {@code reports} with no model identity and no feature name. */
    public Map<String, Object> schema() {
        return schema;
    }

    /** The inputs a visitor fills: a hidden field is not one of them. */
    public int inputCount() {
        return inputCount;
    }

    /** The results a run shows: one per report and model that produces it. */
    public int reportCount() {
        return reportRoutes.size();
    }

    public Set<String> inputKeys() {
        return inputKeys;
    }

    public List<ReportRoute> reportRoutes() {
        return reportRoutes;
    }

    /**
     * The record one model receives: each submitted value, and each value the schema holds for a
     * hidden field, under the feature it routes to. Positional models read features by position,
     * so numeric features come first in ascending order, as the browser serializes the same
     * record in the workspace.
     */
    public Map<String, Object> modelInput(BoundModel model, Map<String, Object> values) {
        Map<String, Object> routed = new LinkedHashMap<>();
        for (InputRoute route : inputRoutes) {
            Object feature = featureFor(route.mappedTo(), model);
            if (feature == null) continue;
            if (route.key() == null) {
                routed.put(featureName(feature), route.stored());
            } else if (values.containsKey(route.key())) {
                routed.put(featureName(feature), values.get(route.key()));
            }
        }
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
                    String inputKey = "in" + inputKeys.size();
                    inputKeys.add(inputKey);
                    inputRoutes.add(new InputRoute(entry, inputKey, null));
                    copy.put(key, inputKey);
                }
            });
            return copy;
        }
        return value;
    }

    /**
     * What MLForm submits for a hidden field, routed without a key. A one-hot field sends each
     * option's feature as 1 for the stored option and 0 for the others.
     */
    private void routeStoredValue(Map<?, ?> field) {
        if (!"include".equals(field.get("inactiveFieldPolicy"))
                || Boolean.FALSE.equals(field.get("includeInSubmission"))) {
            return;
        }
        Object stored = field.get(STORED_VALUE);
        if (ONE_HOT.equals(field.get("kind")) && field.get("options") instanceof List<?> options) {
            for (Object item : options) {
                if (item instanceof Map<?, ?> option && isRouting(option.get(MODEL_ROUTING))) {
                    boolean selected = stored instanceof String value && value.equals(option.get("value"));
                    inputRoutes.add(new InputRoute(option.get(MODEL_ROUTING), null, selected ? 1 : 0));
                }
            }
        } else if (isRouting(field.get(MODEL_ROUTING))) {
            inputRoutes.add(new InputRoute(field.get(MODEL_ROUTING), null, isScalar(stored) ? stored : null));
        }
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

    private static boolean isScalar(Object value) {
        return value instanceof String || value instanceof Boolean
                || (value instanceof Number number && Double.isFinite(number.doubleValue()));
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
