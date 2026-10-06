package dev.ulloasp.mlsuite.schema;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.when;

import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaBookmarkExampleRepository;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRun;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRunStatus;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmarkExample;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaVersion;

/** A bookmark with a realistic form, runs against its snapshots, and an in-memory example table. */
final class BookmarkExampleFixtures {
    private BookmarkExampleFixtures() {}

    static final String MODEL_FEATURE = "age_years";

    /** Fields keyed by display key, label, and id; routed to model features the public never sees. */
    static Map<String, Object> formSchema() {
        return Map.of("fields", List.of(
                Map.of("id", "age", "kind", "number", "label", "Age", "mappedTo", Map.of("model-11", MODEL_FEATURE)),
                Map.of("kind", "category", "label", "Smoker", "displayKey", "smoker", "mappedTo", "smoker_flag"),
                Map.of("kind", "onehot-category", "label", "Sex", "options", List.of(
                        Map.of("label", "Female", "value", "F", "mappedTo", Map.of("model-11", "sex__F")),
                        Map.of("label", "Male", "value", "M", "mappedTo", Map.of("model-11", "sex__M")))),
                Map.of("kind", "text", "label", "Internal note", "hidden", true),
                Map.of("kind", "text", "label", "Notes")));
    }

    /** What the form saves: its own values merged with every model's feature vector. */
    static Map<String, Object> formRunInputs() {
        Map<String, Object> inputs = new LinkedHashMap<>();
        inputs.put("Age", 52);
        inputs.put("smoker", "yes");
        inputs.put("Sex", "F");
        inputs.put("Internal note", "do not publish");
        inputs.put("Notes", "  ");
        inputs.put("Removed field", "left over from an older form");
        inputs.put(MODEL_FEATURE, 52);
        inputs.put("smoker_flag", 1);
        inputs.put("sex__F", 1);
        inputs.put("sex__M", 0);
        return inputs;
    }

    /** What a bulk upload saves: model features only. */
    static Map<String, Object> bulkRunInputs() {
        return Map.of(MODEL_FEATURE, 61, "smoker_flag", "no", "sex__F", 0, "sex__M", 1);
    }

    static SchemaBookmark bookmark() {
        SchemaBookmark bookmark = SchemaFlowFixtures.bookmark();
        bookmark.getVersion().setFormSchema(formSchema());
        return bookmark;
    }

    /** Another snapshot of the bookmark's schema, for it to move to. */
    static SchemaVersion nextVersion(SchemaBookmark bookmark) {
        SchemaVersion version = new SchemaVersion(bookmark.getSchema(), 2, "v2", formSchema());
        version.setId(10L);
        return version;
    }

    static PredictionRun run(Long id, SchemaBookmark bookmark, SchemaVersion version, String name,
            Map<String, Object> inputData) {
        PredictionRun run = new PredictionRun(bookmark, version, name, inputData, PredictionRunStatus.SUCCESS);
        run.setId(id);
        run.setCreatedByName("Alice Owner");
        run.setCreatedByEmail("alice.owner@example.test");
        return run;
    }

    /** Backs a mocked repository with a list, in marking order, and returns that list. */
    static List<SchemaBookmarkExample> stored(SchemaBookmarkExampleRepository repository) {
        List<SchemaBookmarkExample> rows = new ArrayList<>();
        when(repository.save(any())).thenAnswer(call -> {
            SchemaBookmarkExample example = call.getArgument(0);
            example.setId(900L + rows.size());
            rows.add(example);
            return example;
        });
        when(repository.findByBookmarkIdOrderByCreatedAtAscIdAsc(anyLong())).thenAnswer(call -> rows.stream()
                .filter(example -> example.getBookmark().getId().equals(call.getArgument(0)))
                .toList());
        when(repository.findByBookmarkIdIn(anyCollection())).thenAnswer(call -> rows.stream()
                .filter(example -> call.<Collection<Long>>getArgument(0).contains(example.getBookmark().getId()))
                .toList());
        when(repository.findByBookmarkIdAndRunId(anyLong(), anyLong())).thenAnswer(call -> rows.stream()
                .filter(example -> example.getBookmark().getId().equals(call.getArgument(0))
                        && example.getRun().getId().equals(call.getArgument(1)))
                .findFirst());
        doAnswer(call -> rows.removeIf(example -> example.getBookmark().getId().equals(call.getArgument(0))
                && example.getRun().getId().equals(call.getArgument(1))))
                .when(repository).deleteByBookmarkIdAndRunId(anyLong(), anyLong());
        return rows;
    }
}
