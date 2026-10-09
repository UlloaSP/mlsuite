package dev.ulloasp.mlsuite.schema.catalog;

import static dev.ulloasp.mlsuite.schema.catalog.InferenceCatalogValues.displayKey;
import static dev.ulloasp.mlsuite.schema.catalog.InferenceCatalogValues.filled;
import static dev.ulloasp.mlsuite.schema.catalog.InferenceCatalogValues.first;
import static dev.ulloasp.mlsuite.schema.catalog.InferenceCatalogValues.nonBlank;
import static dev.ulloasp.mlsuite.schema.catalog.InferenceCatalogValues.records;
import static dev.ulloasp.mlsuite.schema.catalog.InferenceCatalogValues.snapshotLabel;
import static dev.ulloasp.mlsuite.schema.catalog.InferenceCatalogValues.target;
import static dev.ulloasp.mlsuite.schema.catalog.InferenceCatalogValues.targets;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import dev.ulloasp.mlsuite.schema.application.dto.InferenceTableDto;
import dev.ulloasp.mlsuite.schema.application.dto.InferenceTableRunDto;
import dev.ulloasp.mlsuite.schema.application.dto.PredictionResultDto;
import dev.ulloasp.mlsuite.schema.application.dto.PredictionResultFeedbackDto;
import dev.ulloasp.mlsuite.schema.application.dto.PredictionRunCatalogItemDto;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaVersionDto;
import dev.ulloasp.mlsuite.schema.catalog.InferenceFeedbackValues.Feedback;
import dev.ulloasp.mlsuite.schema.catalog.InferenceReportValues.Produced;
import dev.ulloasp.mlsuite.schema.catalog.InferenceReportValues.Report;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRunOrigin;

/**
 * Joins a table payload into one row per inference, in the payload's order: its summary, and each
 * input field, report output and reviewer answer as a column. Column ids start with the schema, so
 * equally named fields of different schemas never share a column.
 */
final class InferenceRowProjector {

    private static final Logger log = LoggerFactory.getLogger(InferenceRowProjector.class);

    /**
     * @param columns every column the run contributes, whether or not it holds a value
     * @param searchText lowercased text of everything the row shows
     */
    record Row(InferenceCatalogRowDto dto, List<InferenceCatalogColumnDto> columns, String searchText) {
    }

    private final InferenceCatalogText text;

    InferenceRowProjector(InferenceCatalogText text) {
        this.text = text;
    }

    List<Row> project(InferenceTableDto data) {
        Map<Long, SchemaVersionDto> versions = new HashMap<>();
        data.versions().forEach(version -> versions.putIfAbsent(version.id(), version));
        Map<Long, List<PredictionResultDto>> results = data.results().stream()
                .collect(Collectors.groupingBy(PredictionResultDto::runId));
        Map<Long, List<PredictionResultFeedbackDto>> feedback = data.feedback().stream()
                .collect(Collectors.groupingBy(PredictionResultFeedbackDto::resultId));
        List<Row> rows = new ArrayList<>(data.runs().size());
        for (InferenceTableRunDto run : data.runs()) {
            List<PredictionResultDto> members = results.getOrDefault(run.summary().id(), List.of());
            List<PredictionResultFeedbackDto> answers = members.stream()
                    .flatMap(result -> feedback.getOrDefault(result.id(), List.of()).stream())
                    .toList();
            rows.add(project(run, versions.get(run.summary().schemaVersionId()), members, answers));
        }
        return rows;
    }

    private Row project(InferenceTableRunDto run, SchemaVersionDto version, List<PredictionResultDto> results,
            List<PredictionResultFeedbackDto> feedback) {
        PredictionRunCatalogItemDto item = run.summary();
        Cells cells = new Cells(item);
        InferenceFeedbackStatus status = InferenceFeedbackStatus.ERROR;
        try {
            if (version != null) {
                addInputs(cells, version, run.inputData());
            }
            if (InferenceReportValues.executable(version)) {
                List<Produced> produced = results.stream()
                        .map(result -> InferenceReportValues.produced(version, result))
                        .toList();
                addOutputs(cells, version, produced);
                // Feedback order identifies a report within its persisted snapshot, not across versions.
                Feedback review = InferenceFeedbackValues.build(version, produced, feedback,
                        cells.id(item.schemaVersionId() + ":feedback:"),
                        snapshotLabel(item.schemaVersionName(), item.schemaVersion()));
                review.answers().forEach(answer -> cells.add(
                        answer.id(), InferenceColumnGroup.feedback, answer.label(), answer.value()));
                status = review.status();
            }
        } catch (RuntimeException failure) {
            // One inference whose stored payload cannot be read is marked, not allowed to fail the others.
            log.warn("Inference {} could not be fully projected; it is listed with feedback status ERROR: {}",
                    item.id(), failure.toString());
        }
        return cells.row(status, text);
    }

    private static void addInputs(Cells cells, SchemaVersionDto version, Map<String, Object> inputs) {
        for (Map<?, ?> field : records(version.formSchema().get("fields"))) {
            String key = displayKey(field);
            if (key == null || Boolean.TRUE.equals(field.get("hidden"))) {
                continue;
            }
            String label = nonBlank(field.get("label"));
            cells.add(cells.id("input:" + key), InferenceColumnGroup.inputs,
                    label != null ? label : key, input(field, key, inputs));
        }
    }

    /** A field's value under its display key or any model input it maps to; a one-hot field by its active option. */
    private static Object input(Map<?, ?> field, String key, Map<String, Object> inputs) {
        List<String> keys = new ArrayList<>();
        keys.add(key);
        keys.addAll(targets(field.get("mappedTo")));
        for (String candidate : keys) {
            if (!candidate.isEmpty() && filled(inputs.get(candidate))) {
                return inputs.get(candidate);
            }
        }
        if (!"onehot-category".equals(field.get("kind"))) {
            return null;
        }
        for (Map<?, ?> option : records(field.get("options"))) {
            if (targets(option.get("mappedTo")).stream().map(inputs::get).anyMatch(InferenceRowProjector::active)) {
                return first(option.get("value"), option.get("label"));
            }
        }
        return null;
    }

    private static boolean active(Object value) {
        return Boolean.TRUE.equals(value) || "1".equals(value)
                || value instanceof Number number && number.doubleValue() == 1;
    }

    private static void addOutputs(Cells cells, SchemaVersionDto version, List<Produced> results) {
        for (Produced produced : results) {
            Long modelId = produced.result().modelId();
            for (Report report : produced.reports()) {
                long producers = version.bindings().stream()
                        .map(binding -> target(report.config().get("mappedTo"), binding))
                        .filter(route -> route != null && !route.isEmpty())
                        .count();
                cells.add(cells.id("output:" + modelId + ":" + report.target()),
                        InferenceColumnGroup.outputs,
                        producers > 1 ? report.label() + " · Model " + modelId : report.label(),
                        InferenceReportValues.value(report));
            }
        }
    }

    /** The columns and values one run has gathered so far. */
    private static final class Cells {

        private final PredictionRunCatalogItemDto item;
        private final List<InferenceCatalogColumnDto> columns = new ArrayList<>();
        private final Map<String, Object> values = new LinkedHashMap<>();

        private Cells(PredictionRunCatalogItemDto item) {
            this.item = item;
        }

        private String id(String column) {
            return item.schemaId() + ":" + column;
        }

        /** A column the run lacks a value for is still a column; it only has no entry in the values. */
        private void add(String id, InferenceColumnGroup group, String label, Object value) {
            columns.add(new InferenceCatalogColumnDto(
                    id, group, label, item.schemaId(), item.schemaName(), InferenceValueKind.text, List.of()));
            if (filled(value)) {
                values.put(id, value);
            }
        }

        private Row row(InferenceFeedbackStatus status, InferenceCatalogText text) {
            Map<String, String> displayValues = new LinkedHashMap<>();
            values.forEach((id, value) -> displayValues.put(id, text.format(value)));
            List<String> shown = new ArrayList<>(List.of(
                    item.name(),
                    item.schemaName(),
                    Objects.toString(item.bookmarkName(), ""),
                    Objects.toString(item.createdByName(), ""),
                    Objects.toString(item.createdByEmail(), ""),
                    item.origin() == PredictionRunOrigin.PUBLIC ? "visitor public page" : "workspace",
                    String.valueOf(item.id())));
            shown.addAll(displayValues.values());
            return new Row(new InferenceCatalogRowDto(item, status, values, displayValues), columns,
                    String.join(" ", shown).toLowerCase(Locale.ROOT));
        }
    }
}
