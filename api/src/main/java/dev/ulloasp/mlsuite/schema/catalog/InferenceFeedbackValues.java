package dev.ulloasp.mlsuite.schema.catalog;

import static dev.ulloasp.mlsuite.schema.catalog.InferenceCatalogValues.filled;
import static dev.ulloasp.mlsuite.schema.catalog.InferenceCatalogValues.map;
import static dev.ulloasp.mlsuite.schema.catalog.InferenceJsValues.string;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

import com.fasterxml.jackson.databind.ObjectMapper;

import dev.ulloasp.mlsuite.schema.application.dto.PredictionResultFeedbackDto;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaVersionDto;
import dev.ulloasp.mlsuite.schema.catalog.InferenceFeedbackSteps.Field;
import dev.ulloasp.mlsuite.schema.catalog.InferenceFeedbackSteps.Step;
import dev.ulloasp.mlsuite.schema.catalog.InferenceReportValues.Produced;

/** A run's feedback as the table shows it: whether it is complete, and each reviewer's answers. */
final class InferenceFeedbackValues {

    private static final ObjectMapper JSON = new ObjectMapper();

    record Answer(String id, String label, String value) {
    }

    record Feedback(InferenceFeedbackStatus status, List<Answer> answers) {
    }

    /** One saved feedback entry with its answers read once. */
    private record Saved(PredictionResultFeedbackDto entry, Map<?, ?> values) {

        boolean answers(Step step) {
            return entry.type().name().equals(step.type()) && entry.order() == step.order();
        }
    }

    private InferenceFeedbackValues() {
    }

    /**
     * @param prefix what starts the id of every answer column of this run's schema and snapshot
     * @param snapshot the snapshot's label, which tells apart the same question asked by two versions
     */
    static Feedback build(SchemaVersionDto version, List<Produced> results,
            List<PredictionResultFeedbackDto> feedback, String prefix, String snapshot) {
        if (!InferenceFeedbackSteps.valid(version.formSchema())) {
            return new Feedback(InferenceFeedbackStatus.ERROR, List.of());
        }
        List<Step> steps = InferenceFeedbackSteps.of(version, results);
        List<Saved> saved = feedback.stream()
                .map(entry -> new Saved(entry, map(JSON.convertValue(entry.value(), Object.class))))
                .toList();
        return new Feedback(status(steps, saved), answers(steps, saved, prefix, snapshot));
    }

    private static InferenceFeedbackStatus status(List<Step> steps, List<Saved> saved) {
        if (steps.isEmpty()) {
            return InferenceFeedbackStatus.NOT_REQUIRED;
        }
        return steps.stream().allMatch(step -> complete(step, saved))
                ? InferenceFeedbackStatus.COMPLETED
                : InferenceFeedbackStatus.PENDING;
    }

    /** Complete when every result of the step has saved answers, they agree, and none required is missing. */
    private static boolean complete(Step step, List<Saved> saved) {
        if (step.fields().isEmpty()) {
            return false;
        }
        List<Map<?, ?>> targets = new ArrayList<>();
        for (Long resultId : step.resultIds()) {
            Map<?, ?> latest = null;
            for (Saved item : saved) {
                if (item.entry().resultId().equals(resultId) && item.answers(step)) {
                    latest = item.values();
                }
            }
            if (latest == null) {
                return false;
            }
            targets.add(latest);
        }
        Map<?, ?> agreed = targets.get(0);
        for (Field field : step.fields()) {
            if (field.required() && !filled(agreed.get(field.id()))) {
                return false;
            }
            String expected = stored(agreed, field.id());
            if (targets.stream().anyMatch(target -> !Objects.equals(stored(target, field.id()), expected))) {
                return false;
            }
        }
        return true;
    }

    /** An answer as it was stored; an answer never given is not the same as one stored as null. */
    private static String stored(Map<?, ?> values, String fieldId) {
        return values.containsKey(fieldId) ? InferenceJsonValues.json(values.get(fieldId), false) : null;
    }

    /** Each reviewer's answer to each question, one column per report, question and reviewer. */
    private static List<Answer> answers(List<Step> steps, List<Saved> saved, String prefix, String snapshot) {
        Map<String, Set<String>> values = new LinkedHashMap<>();
        Map<String, String> labels = new LinkedHashMap<>();
        for (Saved item : saved) {
            Step step = steps.stream().filter(item::answers).findFirst().orElse(null);
            if (step == null) {
                continue;
            }
            for (Field field : step.fields()) {
                Object value = item.values().get(field.id());
                if (!filled(value)) {
                    continue;
                }
                String id = prefix + step.type() + ":" + step.order() + ":" + field.id() + ":" + item.entry().userId();
                labels.putIfAbsent(id,
                        step.title() + " · " + snapshot + " · " + field.label() + " · " + reviewer(item.entry()));
                values.computeIfAbsent(id, ignored -> new LinkedHashSet<>()).add(answer(value, field));
            }
        }
        List<Answer> answers = new ArrayList<>();
        // A reviewer who answered differently for each model of a combined report has no single answer.
        values.forEach((id, given) -> answers.add(
                new Answer(id, labels.get(id), given.size() == 1 ? given.iterator().next() : "Mixed")));
        return answers;
    }

    /** A member by address or name; feedback with no user was given by a visitor of the public page. */
    private static String reviewer(PredictionResultFeedbackDto entry) {
        if (entry.userEmail() != null && !entry.userEmail().isEmpty()) {
            return entry.userEmail();
        }
        if (entry.userName() != null && !entry.userName().isEmpty()) {
            return entry.userName();
        }
        return entry.userId() == null ? "Visitor" : "user-" + entry.userId();
    }

    /** An answer by the label of the option it chose, compared as text the way the form compared them. */
    private static String answer(Object value, Field field) {
        String text = string(value);
        for (Map<?, ?> option : field.options()) {
            if (option.get("label") instanceof String label
                    && option.containsKey("value")
                    && string(option.get("value")).equals(text)) {
                return label;
            }
        }
        if (value instanceof Boolean flag) {
            return flag ? "Yes" : "No";
        }
        return value instanceof String || value instanceof Number ? text : InferenceJsonValues.json(value, false);
    }
}
