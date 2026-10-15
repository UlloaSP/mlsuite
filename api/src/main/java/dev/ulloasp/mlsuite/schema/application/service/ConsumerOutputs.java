package dev.ulloasp.mlsuite.schema.application.service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import dev.ulloasp.mlsuite.schema.application.dto.ConsumerPredictionDto.ConsumerOutput;

/**
 * The outputs a consumer is given, read from the runtime's reply as a stored run reads it. A
 * reply that does not read whole (no reports, a kind the endpoint does not serve, labels and
 * probabilities that do not pair up, a value that is not a number) is not a prediction: the
 * reason is returned instead, and the run is neither answered nor kept.
 */
final class ConsumerOutputs {

    /** The outputs, or why the reply cannot give them. */
    record Read(List<ConsumerOutput> outputs, String malformed) {
    }

    private ConsumerOutputs() {
    }

    static Read of(Map<String, Object> answer) {
        if (!(answer.get("reports") instanceof List<?> reports) || reports.isEmpty()) {
            return malformed("the reply has no reports");
        }
        List<ConsumerOutput> outputs = new ArrayList<>();
        for (Object item : reports) {
            if (!(item instanceof Map<?, ?> report)) return malformed("a report is not an object");
            Map<String, Object> read = new LinkedHashMap<>();
            report.forEach((key, value) -> read.put(String.valueOf(key), value));
            String kind = String.valueOf(read.get("kind"));
            Optional<ConsumerOutput> output = switch (kind) {
                case "classifier" -> classifier(read);
                case "regressor" -> regressor(read);
                default -> Optional.empty();
            };
            if (output.isEmpty()) return malformed("a " + kind + " report cannot be read");
            outputs.add(output.get());
        }
        return new Read(List.copyOf(outputs), null);
    }

    /** Every probability a number, one label per probability, as the runtime gave them. */
    private static Optional<ConsumerOutput> classifier(Map<String, Object> report) {
        int givenProbabilities = size(report.get("probabilities") instanceof List<?> rows && !rows.isEmpty()
                && rows.get(0) instanceof List<?> first ? first : report.get("probabilities"));
        int givenLabels = size(report.get("mapping"));
        PublicRunReports.asWorkspaceStores("classifier", report);
        List<?> labels = (List<?>) report.get("labels");
        List<?> probabilities = (List<?>) report.get("probabilities");
        if (probabilities.isEmpty() || probabilities.size() != givenProbabilities
                || labels.size() != givenLabels || labels.size() != probabilities.size()) {
            return Optional.empty();
        }
        Map<String, Double> byLabel = new LinkedHashMap<>();
        for (int i = 0; i < labels.size(); i++) {
            byLabel.put((String) labels.get(i), (Double) probabilities.get(i));
        }
        return Optional.of(ConsumerOutput.classifier(String.valueOf(report.get("prediction")), byLabel));
    }

    private static Optional<ConsumerOutput> regressor(Map<String, Object> report) {
        int given = size(report.get("values"));
        PublicRunReports.asWorkspaceStores("regressor", report);
        List<?> values = (List<?>) report.get("values");
        if (values.isEmpty() || values.size() != given) return Optional.empty();
        return Optional.of(ConsumerOutput.regressor((Double) values.get(0)));
    }

    private static int size(Object value) {
        if (value instanceof List<?> items) return items.size();
        return value instanceof Map<?, ?> entries ? entries.size() : 0;
    }

    private static Read malformed(String reason) {
        return new Read(List.of(), reason);
    }
}
