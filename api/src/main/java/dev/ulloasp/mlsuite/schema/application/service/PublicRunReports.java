package dev.ulloasp.mlsuite.schema.application.service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import dev.ulloasp.mlsuite.schema.application.dto.PublicPredictionReportDto;
import dev.ulloasp.mlsuite.schema.application.dto.PublicRunFeedbackDto;
import dev.ulloasp.mlsuite.schema.application.service.PublicForm.ReportRoute;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResult;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultFeedback;

/**
 * The reports of a run made outside the workspace, stored as a workspace run stores them and
 * read back under the public form's keys. Each report route names the
 * model and the stored report; the result of that model holds, among its reports, the copy the
 * run stored for that report, and that copy minus the workspace's own naming is the payload
 * the runtime gave. A report no model answered has no copy and is left out.
 */
public final class PublicRunReports {

    private static final Set<String> STORED_NAMING = Set.of("id", "mappedTo");

    private PublicRunReports() {
    }

    static List<PublicPredictionReportDto> of(List<ReportRoute> routes, List<PredictionResult> results) {
        List<PublicPredictionReportDto> reports = new ArrayList<>();
        for (ReportRoute route : routes) {
            results.stream()
                    .filter(result -> result.getModel().getId().equals(route.modelId()))
                    .findFirst()
                    .flatMap(result -> storedCopy(route, result.getOutput()))
                    .ifPresent(payload -> reports.add(new PublicPredictionReportDto(route.key(), payload)));
        }
        return reports;
    }

    static List<PublicRunFeedbackDto> feedback(List<ReportRoute> routes, List<PredictionResultFeedback> feedback) {
        List<PublicRunFeedbackDto> answers = new ArrayList<>();
        for (PredictionResultFeedback item : feedback) {
            Long modelId = item.getResult().getModel().getId();
            routes.stream()
                    .filter(route -> route.modelId().equals(modelId) && route.order() == item.getOrder())
                    .findFirst()
                    .ifPresent(route -> answers.add(new PublicRunFeedbackDto(route.key(), item.getType(), item.getValue())));
        }
        return answers;
    }

    /**
     * A model's answer as every run stores it, whether a member, a visitor or an API client made
     * it: the runtime's reply, its reports followed by one copy per stored report the model
     * serves (named and routed as the workspace names and routes them), and the meta a run
     * records. {@code input} is the record the model received.
     */
    public static Map<String, Object> storedOutput(Long modelId, Map<String, Object> input, Map<String, Object> answer,
            List<ReportRoute> routes) {
        Map<String, Object> output = new LinkedHashMap<>(answer);
        List<Object> reports = new ArrayList<>(answer.get("reports") instanceof List<?> items ? items : List.of());
        List<Object> answered = List.copyOf(reports);
        for (ReportRoute route : routes) {
            Map<?, ?> raw = route.modelId().equals(modelId) ? answerTo(route, answered) : null;
            if (raw == null) continue;
            Map<String, Object> copy = new LinkedHashMap<>();
            raw.forEach((key, value) -> copy.put(String.valueOf(key), value));
            asWorkspaceStores(route.kind(), copy);
            copy.put("id", route.storedId());
            copy.put("kind", route.kind());
            copy.put("mappedTo", route.target());
            reports.add(copy);
        }
        output.put("reports", reports);
        Map<String, Object> meta = new LinkedHashMap<>();
        if (answer.get("meta") instanceof Map<?, ?> given) given.forEach((key, value) -> meta.put(String.valueOf(key), value));
        output.put("meta", meta);
        return output;
    }

    /**
     * The runtime answers a classifier with one row of probabilities, its class mapping and the
     * class the model itself decides; a workspace run stores that row, the class labels and the
     * predicted class, and a regressor's values as numbers. Every reader of a stored run expects
     * that shape. A model that decides no class is read as its most probable one.
     */
    public static void asWorkspaceStores(String kind, Map<String, Object> report) {
        if ("classifier".equals(kind)) {
            List<Double> probabilities = numbers(report.get("probabilities"));
            List<String> labels = labels(report.get("mapping"));
            report.put("probabilities", probabilities);
            report.put("labels", labels);
            if (!(report.get("prediction") instanceof String) && !probabilities.isEmpty()) {
                int best = probabilities.indexOf(Collections.max(probabilities));
                if (best < labels.size()) report.put("prediction", labels.get(best));
            }
        } else if ("regressor".equals(kind)) {
            report.put("values", numbers(report.get("values")));
        }
    }

    /**
     * The runtime's report for a stored report: the first of its kind. A prediction names the
     * model output it answers, and then answers only the report mapped to that output.
     */
    static Map<?, ?> answerTo(ReportRoute route, List<Object> answered) {
        for (Object item : answered) {
            if (item instanceof Map<?, ?> report && route.kind().equals(report.get("kind"))
                    && (!(report.get("output") instanceof Number output)
                            || route.target().equals(String.valueOf(output.longValue())))) {
                return report;
            }
        }
        return null;
    }

    /** The numbers of a list; anything else in it is left out. */
    private static List<Double> numbers(Object value) {
        List<?> items = value instanceof List<?> list ? list : List.of();
        return items.stream().filter(Number.class::isInstance).map(item -> ((Number) item).doubleValue()).toList();
    }

    /** Class labels in class order; anything that is not a label is left out. */
    private static List<String> labels(Object mapping) {
        List<?> items = mapping instanceof List<?> list ? list : List.of();
        return items.stream().filter(String.class::isInstance).map(String.class::cast).toList();
    }

    /**
     * The id a run stores a form report's copy under: the report's id, else its label, else its
     * position in the form. The browser names stored copies by the same rule (stored-report.ts).
     */
    public static String storedId(Map<?, ?> report, int order) {
        if (report.get("id") instanceof String id) return id;
        return report.get("label") instanceof String label ? label : String.valueOf(order);
    }

    /**
     * The copy a run stored of one form report among a model's stored reports: the one named by
     * the report's stored id and routed to the output it reads. Two reports may read the same
     * output (a class and its explanation), so the output alone does not tell them apart. The
     * inference catalog and the browser read stored copies by this rule.
     */
    public static Optional<Map<?, ?>> storedCopy(List<?> reports, String storedId, String target) {
        for (Object item : reports) {
            if (item instanceof Map<?, ?> report && storedId.equals(report.get("id"))
                    && target.equals(String.valueOf(report.get("mappedTo")))) {
                return Optional.of(report);
            }
        }
        return Optional.empty();
    }

    private static Optional<Map<String, Object>> storedCopy(ReportRoute route, Map<String, Object> output) {
        List<?> reports = output.get("reports") instanceof List<?> items ? items : List.of();
        return storedCopy(reports, route.storedId(), route.target()).map(report -> {
            Map<String, Object> payload = new LinkedHashMap<>();
            report.forEach((key, value) -> {
                if (!STORED_NAMING.contains(String.valueOf(key))) payload.put(String.valueOf(key), value);
            });
            return payload;
        });
    }
}
