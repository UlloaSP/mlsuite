package dev.ulloasp.mlsuite.schema.application.service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
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
final class PublicRunReports {

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
     * A model's answer as a workspace run stores it: the runtime's reply, its reports followed
     * by one copy per stored report the model serves (named and routed as the workspace names
     * and routes them), and the meta a workspace run records. {@code input} is the record the
     * model received.
     */
    static Map<String, Object> storedOutput(Long modelId, Map<String, Object> input, Map<String, Object> answer,
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
        meta.put("modelId", String.valueOf(modelId));
        meta.put("backendFieldValues", input);
        output.put("meta", meta);
        return output;
    }

    /**
     * The runtime answers a classifier with one row of probabilities, its class mapping and the
     * class the model itself decides; a workspace run stores that row, the class labels and the
     * predicted class, and a regressor's values as numbers. Every reader of a stored run expects
     * that shape. A model that decides no class is read as its most probable one.
     */
    static void asWorkspaceStores(String kind, Map<String, Object> report) {
        if ("classifier".equals(kind)) {
            List<Double> probabilities = numbers(report.get("probabilities") instanceof List<?> rows
                    && !rows.isEmpty() && rows.get(0) instanceof List<?> first ? first : report.get("probabilities"));
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

    private static List<Double> numbers(Object value) {
        List<Double> numbers = new ArrayList<>();
        if (value instanceof List<?> items) {
            for (Object item : items) {
                if (item instanceof Number number) {
                    numbers.add(number.doubleValue());
                } else if (item instanceof String text) {
                    try {
                        numbers.add(Double.valueOf(text.strip()));
                    } catch (NumberFormatException ignored) {
                        // Not a number: left out, as the workspace leaves it out.
                    }
                }
            }
        }
        return numbers;
    }

    /** Class labels in class order: a list as given, or a map keyed by class index. */
    private static List<String> labels(Object mapping) {
        if (mapping instanceof List<?> items) {
            return items.stream().filter(String.class::isInstance).map(String.class::cast).toList();
        }
        if (mapping instanceof Map<?, ?> byIndex) {
            return byIndex.entrySet().stream()
                    .sorted(Comparator.comparingDouble(entry -> index(entry.getKey())))
                    .map(Map.Entry::getValue)
                    .filter(String.class::isInstance)
                    .map(String.class::cast)
                    .toList();
        }
        return List.of();
    }

    private static double index(Object key) {
        try {
            return Double.parseDouble(String.valueOf(key));
        } catch (NumberFormatException ex) {
            return Double.MAX_VALUE;
        }
    }

    private static Optional<Map<String, Object>> storedCopy(ReportRoute route, Map<String, Object> output) {
        List<?> reports = output.get("reports") instanceof List<?> items ? items : List.of();
        for (Object item : reports) {
            if (item instanceof Map<?, ?> report
                    && route.storedId().equals(report.get("id"))
                    && route.target().equals(String.valueOf(report.get("mappedTo")))) {
                Map<String, Object> payload = new LinkedHashMap<>();
                report.forEach((key, value) -> {
                    if (!STORED_NAMING.contains(String.valueOf(key))) payload.put(String.valueOf(key), value);
                });
                return Optional.of(payload);
            }
        }
        return Optional.empty();
    }
}
