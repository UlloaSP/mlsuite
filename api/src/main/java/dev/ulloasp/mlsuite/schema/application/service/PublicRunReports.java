package dev.ulloasp.mlsuite.schema.application.service;

import java.util.ArrayList;
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
