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
 * A stored public run read back under the public form's keys. Each report route names the
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
     * The runtime answers a classifier with one row of probabilities per instance and its class
     * mapping; a workspace run stores that row alone, the class labels and the predicted class,
     * and a regressor's values as numbers. Every reader of a stored run expects that shape.
     */
    static void asWorkspaceStores(String kind, Map<String, Object> report) {
        if ("classifier".equals(kind)) {
            List<Double> probabilities = numbers(report.get("probabilities") instanceof List<?> rows
                    && !rows.isEmpty() && rows.get(0) instanceof List<?> first ? first : report.get("probabilities"));
            List<String> labels = labels(report.get("mapping"));
            report.put("probabilities", probabilities);
            report.put("labels", labels);
            if (!probabilities.isEmpty()) {
                int best = probabilities.indexOf(Collections.max(probabilities));
                if (best < labels.size()) report.put("prediction", labels.get(best));
            } else if (report.get("label") instanceof String label) {
                report.put("prediction", label);
            }
        } else if ("regressor".equals(kind)) {
            report.put("values", numbers(report.get("values")));
        }
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
