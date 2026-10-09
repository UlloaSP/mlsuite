package dev.ulloasp.mlsuite.schema.catalog;

import static dev.ulloasp.mlsuite.schema.catalog.InferenceCatalogValues.first;
import static dev.ulloasp.mlsuite.schema.catalog.InferenceCatalogValues.list;
import static dev.ulloasp.mlsuite.schema.catalog.InferenceCatalogValues.map;
import static dev.ulloasp.mlsuite.schema.catalog.InferenceCatalogValues.nonBlank;
import static dev.ulloasp.mlsuite.schema.catalog.InferenceCatalogValues.records;
import static dev.ulloasp.mlsuite.schema.catalog.InferenceJsValues.string;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;

import dev.ulloasp.mlsuite.schema.application.dto.PredictionResultDto;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaVersionDto;
import dev.ulloasp.mlsuite.schema.catalog.InferenceReportValues.Produced;
import dev.ulloasp.mlsuite.schema.catalog.InferenceReportValues.Report;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultStatus;

/** The feedback a snapshot asks for on a run: an assessment of each built-in output, and each questionnaire. */
final class InferenceFeedbackSteps {

    /**
     * The most classes a bare class index may imply. A model's own labels and mapping are never cut;
     * past them an option only repeats its index as its label, so a stored index of thirty million
     * must not become thirty million options.
     */
    static final int MAX_INDEXED_CLASSES = 1_000;

    private static final String OUTPUT = "OUTPUT";
    private static final String EXPLANATION = "EXPLANATION";
    private static final String ASSESSMENT_FIELD_ID = "output-feedback-assessment";
    private static final Pattern NOT_ID_TEXT = Pattern.compile("[^a-z0-9]+");
    private static final Pattern EDGE_DASH = Pattern.compile("^-|-$");

    record Field(String id, String label, boolean required, List<Map<?, ?>> options) {
    }

    record Step(String type, int order, String title, List<Field> fields, List<Long> resultIds) {
    }

    private InferenceFeedbackSteps() {
    }

    /** Whether every questionnaire of the snapshot has steps with an id, a title and typed fields. */
    static boolean valid(Map<String, Object> schema) {
        for (Map<?, ?> report : records(schema.get("reports"))) {
            Object config = report.get("feedbackQuestionnaire");
            if (config != null && !validQuestionnaire(map(config))) {
                return false;
            }
        }
        return true;
    }

    static List<Step> of(SchemaVersionDto version, List<Produced> results) {
        List<Step> steps = new ArrayList<>();
        List<Map<?, ?>> configs = records(version.formSchema().get("reports"));
        for (int order = 0; order < configs.size(); order++) {
            List<Long> resultIds = new ArrayList<>();
            Produced firstResult = null;
            Report display = null;
            for (Produced produced : results) {
                Report report = successful(produced, order);
                if (report == null) {
                    continue;
                }
                resultIds.add(produced.result().id());
                if (display == null) {
                    firstResult = produced;
                    display = report;
                }
            }
            if (display == null) {
                continue;
            }
            if (InferenceReportValues.builtin(display.kind())) {
                Field assessment = new Field(ASSESSMENT_FIELD_ID, "Assessment", true,
                        display.kind().equals("classifier") ? classes(display, firstResult.result()) : List.of());
                steps.add(new Step(OUTPUT, order, display.label(), List.of(assessment), resultIds));
            }
            if (configs.get(order).get("feedbackQuestionnaire") instanceof Map<?, ?> questionnaire) {
                steps.add(new Step(EXPLANATION, order, display.label() + " review", fields(questionnaire), resultIds));
            }
        }
        return steps;
    }

    /** How many classes a stored class index implies on its own, never more than {@link #MAX_INDEXED_CLASSES}. */
    static int indexedClasses(Object classIndex) {
        double classes = classIndex instanceof Number number ? number.doubleValue() + 1 : 1;
        return classes >= 1 ? (int) Math.min(classes, MAX_INDEXED_CLASSES) : 1;
    }

    private static Report successful(Produced produced, int order) {
        if (produced.result().status() != PredictionResultStatus.SUCCESS) {
            return null;
        }
        for (Report report : produced.reports()) {
            if (report.order() == order) {
                return report;
            }
        }
        return null;
    }

    /** A classifier's assessment choices: each class by its label, valued as the model names it. */
    private static List<Map<?, ?>> classes(Report display, PredictionResultDto result) {
        List<String> labels = InferenceReportValues.configuredLabels(display.config().get("labels"));
        List<?> mapping = List.of();
        for (Map<?, ?> output : records(result.output().get("reports"))) {
            if ("classifier".equals(output.get("kind"))) {
                mapping = list(output.get("mapping"));
                break;
            }
        }
        int size = Math.max(
                Math.max(labels.size(), mapping.size()), indexedClasses(display.payload().get("classIndex")));
        List<Map<?, ?>> options = new ArrayList<>(size);
        for (int index = 0; index < size; index++) {
            Object mapped = index < mapping.size() ? mapping.get(index) : null;
            String label = index < labels.size() ? labels.get(index) : null;
            options.add(Map.of(
                    "label", label != null ? label : string(first(mapped, index)),
                    "value", string(first(mapped, label, index))));
        }
        return options;
    }

    private static List<Field> fields(Map<?, ?> questionnaire) {
        List<Field> fields = new ArrayList<>();
        for (Map<?, ?> step : records(questionnaire.get("steps"))) {
            List<Map<?, ?>> configs = records(step.get("fields"));
            for (int index = 0; index < configs.size(); index++) {
                Map<?, ?> field = configs.get(index);
                Object label = field.get("label");
                Object id = field.get("id");
                String fieldId = id != null ? string(id) : string(step.get("id")) + "-" + idFromLabel(label, index);
                fields.add(new Field(fieldId, label != null ? string(label) : fieldId,
                        !Boolean.FALSE.equals(field.get("required")), records(field.get("options"))));
            }
        }
        return fields;
    }

    private static String idFromLabel(Object label, int index) {
        String text = nonBlank(label);
        if (text == null) {
            return "field-" + (index + 1);
        }
        String lower = InferenceJsValues.trim(text).toLowerCase(Locale.ROOT);
        return EDGE_DASH.matcher(NOT_ID_TEXT.matcher(lower).replaceAll("-")).replaceAll("");
    }

    private static boolean validQuestionnaire(Map<?, ?> questionnaire) {
        List<Map<?, ?>> steps = records(questionnaire.get("steps"));
        if (steps.isEmpty() || steps.size() != list(questionnaire.get("steps")).size()) {
            return false;
        }
        for (Map<?, ?> step : steps) {
            List<Map<?, ?>> fields = records(step.get("fields"));
            if (!(step.get("id") instanceof String)
                    || !(step.get("title") instanceof String)
                    || fields.isEmpty()
                    || fields.size() != list(step.get("fields")).size()
                    || fields.stream().anyMatch(field -> !(field.get("kind") instanceof String))) {
                return false;
            }
        }
        return true;
    }
}
