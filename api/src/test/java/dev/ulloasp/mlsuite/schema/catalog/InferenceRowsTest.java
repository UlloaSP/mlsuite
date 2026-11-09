package dev.ulloasp.mlsuite.schema.catalog;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import dev.ulloasp.mlsuite.model.RecordedSql;
import dev.ulloasp.mlsuite.principal.application.service.Principals;
import dev.ulloasp.mlsuite.schema.PublicPredictionFixture;
import dev.ulloasp.mlsuite.schema.application.dto.PredictionRunCatalogItemDto;
import dev.ulloasp.mlsuite.schema.application.service.FeedbackHistory;
import dev.ulloasp.mlsuite.schema.catalog.InferenceCatalogOrder.Ranked;
import dev.ulloasp.mlsuite.schema.catalog.InferenceRowProjector.Row;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResult;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultFeedback;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultFeedbackType;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultStatus;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRun;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRunStatus;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaModelBinding;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaVersion;

/**
 * Derived sorts and the table's columns read each run's stored row and give exactly what projecting
 * every run gives: the table's own comparator over text with accents, case and digit runs, numbers,
 * booleans, JSON and missing values, in several locales, both directions, with ties on creation
 * time; and the same columns, kinds and choices. Only the refresh writes rows; a read projects the
 * runs without a current row, so neither a new locale nor a stale row makes it fill a scope.
 */
class InferenceRowsTest extends PublicPredictionFixture {

    @Autowired
    private Principals principals;

    private static final List<Object> AGES = List.of("élan", "Elan", "elan", "ELAN", "file10", "file2", "file02",
            "Zebra", "zebra", "ñandú", "nandu", "Ärger", "ärger", "arg", "z", "å", "Ångström", "ı", "I", "i",
            "  spaced", "x-ray", "x ray", "xray", "10", "9", "-3", "1e3", 42, 7.5, -0.25, 0, 1000000, 3,
            true, false, Map.of("k", 1), List.of(1, 2), "", "😀", "中文", "日本");
    private static final Map<String, Object> RISK = Map.of("reports", List.of(Map.of("id", "Risk", "mappedTo", "risk",
            "kind", "classifier", "prediction", "high", "mapping", List.of("low", "high"))));

    @Autowired InferenceCatalogService catalog;
    @Autowired InferenceCatalogReader reader;
    @Autowired InferenceRows rows;
    @Autowired InferenceRowRefresher refresher;
    @Autowired FeedbackHistory history;
    @Autowired JdbcTemplate jdbc;
    /** A snapshot whose Risk report the forest produces, routed by the model's name, and reviewers assess. */
    private SchemaVersion snapshot;

    @BeforeEach
    void variedRuns() {
        authorizeOwner();
        OffsetDateTime at = OffsetDateTime.parse("2026-10-01T10:00:00Z");
        inTransaction(() -> {
            snapshot = new SchemaVersion(schema, 4, "Reviewed", Map.of(
                    "fields", List.of(Map.of("kind", "number", "label", "Age"),
                            Map.of("kind", "number", "label", "Cholesterol")),
                    "reports", List.of(Map.of("kind", "classifier", "label", "Risk",
                            "mappedTo", Map.of("risk-forest", "risk")))), principals.system());
            entityManager.persist(snapshot);
            entityManager.persist(new SchemaModelBinding(snapshot, forestModel, Map.of()));
            for (int i = 0; i < AGES.size(); i++) {
                Map<String, Object> inputs = new HashMap<>();
                inputs.put("Age", AGES.get(i));
                entityManager.persist(new PredictionRun(null, snapshot, "vary-" + i, inputs, PredictionRunStatus.SUCCESS, principals.system()));
            }
            for (int i = 0; i < 6; i++) {
                // Runs without the column, which go last in either direction, and two that were answered.
                PredictionRun run = new PredictionRun(null, snapshot, "none-" + i, Map.of("Cholesterol", i),
                        PredictionRunStatus.SUCCESS, principals.system());
                entityManager.persist(run);
                PredictionResult result = new PredictionResult(run, forestModel, Map.of(), RISK,
                        PredictionResultStatus.SUCCESS, null, null);
                entityManager.persist(result);
                if (i < 2) {
                    history.save(answer(result, i == 0 ? "high" : "low"), principals.of(owner));
                }
            }
            entityManager.flush();
            // Half share one creation time, so ties fall back to the table's own order.
            // Stands in for runs created earlier: a run is otherwise written once.
            entityManager.createNativeQuery("SET LOCAL session_replication_role = replica").executeUpdate();
            entityManager.createQuery("update PredictionRun r set r.createdAt = :at where r.schemaVersion.id = :version"
                    + " and mod(r.id, 2) = 0").setParameter("at", at).setParameter("version", snapshot.getId())
                    .executeUpdate();
            entityManager.createNativeQuery("SET LOCAL session_replication_role = origin").executeUpdate();
        });
    }

    @ParameterizedTest
    @CsvSource({ "en-US,asc", "en-US,desc", "es-ES,asc", "de-DE,desc", "sv-SE,asc", "tr-TR,asc", "ja-JP,desc" })
    void storedRowsOrderADerivedColumnExactlyAsProjectingEveryRunDoes(String locale, String direction) {
        for (String sort : List.of(age() + "." + direction, "feedbackStatus." + direction)) {
            List<Long> expected = projectedOrder(sort, locale);
            // No row yet: the read projects every run itself, and stores nothing.
            assertEquals(expected, paged(sort, locale), sort);
            assertEquals(0, projectedRows());
            refresher.refresh();
            assertEquals(runs().size(), projectedRows());
            assertEquals(expected, paged(sort, locale), sort);
            assertEquals(expected, selected(sort, locale), sort);
            // Half of them no longer current: those are projected, the rest read.
            jdbc.update("UPDATE prediction_run_projection SET answer_changes = answer_changes + 1 WHERE mod(prediction_run_id, 2) = 1"
                    + " AND prediction_run_id = ANY(?)", (Object) runs().toArray(Long[]::new));
            assertEquals(expected, paged(sort, locale), sort);
            jdbc.update("DELETE FROM prediction_run_projection WHERE prediction_run_id = ANY(?)", (Object) runs().toArray(Long[]::new));
        }
    }

    @Test
    void aFirstReadInANewLocaleReadsOnlyItsPageAndNoReadWrites() throws Exception {
        inTransaction(() -> {
            for (int i = 0; i < 230; i++) {
                entityManager.persist(new PredictionRun(null, snapshot, "more-" + i, Map.of("Age", i),
                        PredictionRunStatus.SUCCESS, principals.system()));
            }
        });
        String sort = age() + ".asc";
        refresher.refresh();
        String stored = checksum();

        List<String> current = RecordedSql.during(() -> catalog.page(owner.getId(), request(3, sort, "fi-FI")));
        List<String> columns = RecordedSql.during(() -> catalog.metadata(owner.getId(), request(0, sort, "fi-FI")));
        jdbc.update("UPDATE prediction_run_projection SET answer_changes = answer_changes + 1 WHERE prediction_run_id = ANY(?)",
                (Object) runs().subList(0, 3).toArray(Long[]::new));
        List<String> threeStale = RecordedSql.during(() -> catalog.page(owner.getId(), request(0, sort, "pl-PL")));

        // A batch of payloads is read with two statements: results, then answers. 278 runs would take three.
        assertEquals(2, payloadReads(current), current::toString);
        assertEquals(2, payloadReads(columns), columns::toString);
        assertEquals(4, payloadReads(threeStale), threeStale::toString);
        jdbc.update("UPDATE prediction_run_projection SET answer_changes = answer_changes - 1 WHERE prediction_run_id = ANY(?)",
                (Object) runs().subList(0, 3).toArray(Long[]::new));
        assertEquals(stored, checksum());
    }

    @Test
    void aNewAnswerMakesTheRowStaleAtOnceAndTheRefreshProjectsItAgain() {
        String sort = "feedbackStatus.asc";
        refresher.refresh();
        Long pending = runId("none-2");
        inTransaction(() -> {
            PredictionResult result = entityManager.createQuery(
                    "select x from PredictionResult x where x.run.id = :run", PredictionResult.class)
                    .setParameter("run", pending).getSingleResult();
            history.save(answer(result, "high"), principals.of(owner));
        });

        assertTrue(rows.stale(runs()).contains(pending));
        assertEquals(projectedOrder(sort, "en-US"), paged(sort, "en-US"));
        refresher.refresh();
        assertEquals(Set.of(), rows.stale(runs()));
        assertEquals("COMPLETED", jdbc.queryForObject(
                "SELECT feedback_status FROM prediction_run_projection WHERE prediction_run_id = ?", String.class, pending));
        assertEquals(projectedOrder(sort, "en-US"), paged(sort, "en-US"));

        // An answer counted after a projection read what it derives from leaves that projection stale.
        Long answered = runId("none-0");
        Map<Long, InferenceRows.Source> sources = rows.sources(List.of(answered));
        List<Row> projected = new ArrayList<>();
        reader.selected(owner.getId(), List.of(answered), table -> projected.addAll(
                new InferenceRowProjector(InferenceCatalogText.of("en-US")).project(table)));
        inTransaction(() -> history.delete(entityManager.createQuery(
                "select f from PredictionResultFeedback f where f.result.run.id = :run", PredictionResultFeedback.class)
                .setParameter("run", answered).getResultList(), principals.of(owner)));
        rows.store(projected, sources);
        assertEquals(Set.of(answered), rows.stale(List.of(answered)));
        assertEquals(projectedOrder(sort, "en-US"), paged(sort, "en-US"));
    }

    @Test
    void renamingAModelMakesItsSnapshotsRowsStale() {
        String sort = "feedbackStatus.desc";
        refresher.refresh();
        // Reports route by model name: under its new name the forest produces no Risk report.
        jdbc.update("UPDATE model SET name = 'renamed-forest' WHERE id = ?", forestModel.getId());

        assertEquals(runs().size(), rows.stale(runs()).size());
        assertEquals(projectedOrder(sort, "en-US"), paged(sort, "en-US"));
        refresher.refresh();
        assertEquals(0, rows.stale(runs()).size());
        assertEquals(projectedOrder(sort, "en-US"), paged(sort, "en-US"));
    }

    @Test
    void madeUpLocaleTagsStoreNothingAndOrderAsTheirLanguage() {
        String sort = age() + ".asc";
        refresher.refresh();
        String stored = checksum();
        List<Long> english = paged(sort, "en-US");
        List<Long> german = paged(sort, "de-DE");

        for (int i = 0; i < 20; i++) {
            assertEquals(english, paged(sort, "en-US-x-made-up-" + i));
        }
        assertEquals(english, paged(sort, "en-US-u-co-phonebk-kn-false"));
        assertEquals(german, paged(sort, "de-DE-u-co-phonebk"));
        assertEquals(projectedOrder(sort, "zz-ZZ"), paged(sort, "zz-ZZ"));
        assertEquals(stored, checksum());
    }

    @Test
    void storedRowsGiveTheColumnsKindsAndChoicesProjectingEveryRunGives() {
        for (String locale : List.of("en-US", "es-ES", "sv-SE")) {
            assertEquals(projectedColumns(locale), columns(locale), locale);
        }
        refresher.refresh();
        for (String locale : List.of("en-US", "es-ES", "sv-SE")) {
            assertEquals(projectedColumns(locale), columns(locale), locale);
        }
        // A reviewer's new name names their answers' column although no row changes.
        String stored = checksum();
        jdbc.update("UPDATE app_user SET full_name = ? WHERE id = ?", "Renamed Owner", owner.getId());
        assertTrue(columns("en-US").stream().anyMatch(column -> column.label().endsWith("Renamed Owner")));
        assertEquals(projectedColumns("en-US"), columns("en-US"));
        assertEquals(stored, checksum());
    }

    @Test
    void aRunDeletedAfterItWasFoundStaleIsNotStoredAndADeletedRunLeavesNoRow() {
        Long gone = runId("vary-1");
        Long kept = runId("vary-2");
        Map<Long, InferenceRows.Source> sources = rows.sources(List.of(gone, kept));
        List<Row> projected = new ArrayList<>();
        reader.selected(owner.getId(), List.of(gone, kept), table -> projected.addAll(
                new InferenceRowProjector(InferenceCatalogText.of("en-US")).project(table)));
        deleteRun(gone);

        rows.store(projected, sources);

        assertEquals(List.of(kept), jdbc.queryForList(
                "SELECT prediction_run_id FROM prediction_run_projection WHERE prediction_run_id = ANY(?)", Long.class,
                (Object) new Long[] { gone, kept }));
        deleteRun(kept);
        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM prediction_run_projection WHERE prediction_run_id = ?",
                Long.class, kept));
    }

    /** What the table showed before rows were stored: every run of the scope projected and sorted in memory. */
    private List<Long> projectedOrder(String sort, String locale) {
        InferenceCatalogText text = InferenceCatalogText.of(locale);
        InferenceCatalogOrder order = InferenceCatalogOrder.of(sort, text);
        InferenceRowProjector projector = new InferenceRowProjector(text);
        List<Ranked> ranked = new ArrayList<>();
        reader.scan(owner.getId(), InferenceCatalogScope.rows(request(0, sort, locale)),
                table -> projector.project(table).forEach(row -> ranked.add(order.rank(row))));
        return ranked.stream().sorted(order.comparator()).map(row -> row.item().id()).toList();
    }

    private List<InferenceCatalogColumnDto> projectedColumns(String locale) {
        InferenceCatalogText text = InferenceCatalogText.of(locale);
        InferenceCatalogMetadata metadata = new InferenceCatalogMetadata(text);
        InferenceRowProjector projector = new InferenceRowProjector(text);
        reader.scan(owner.getId(), InferenceCatalogScope.columns(request(0, "createdAt.desc", locale)),
                table -> projector.project(table).forEach(metadata::accept));
        return metadata.finish();
    }

    private List<InferenceCatalogColumnDto> columns(String locale) {
        return catalog.metadata(owner.getId(), request(0, "createdAt.desc", locale)).columns();
    }

    private List<Long> paged(String sort, String locale) {
        List<Long> paged = new ArrayList<>();
        long total = runs().size();
        for (int page = 0; page * 10 < total; page++) {
            var result = catalog.page(owner.getId(), request(page, sort, locale));
            assertEquals(total, result.totalItems());
            result.items().forEach(row -> paged.add(row.item().id()));
        }
        return paged;
    }

    private List<Long> selected(String sort, String locale) {
        return catalog.selection(owner.getId(), request(0, sort, locale)).stream()
                .map(PredictionRunCatalogItemDto::id).toList();
    }

    private List<Long> runs() {
        return jdbc.queryForList("SELECT id FROM prediction_run WHERE schema_version_id = ? ORDER BY id", Long.class,
                snapshot.getId());
    }

    private Long runId(String name) {
        return jdbc.queryForObject("SELECT id FROM prediction_run WHERE name = ? AND schema_version_id = ?", Long.class,
                name, snapshot.getId());
    }

    private long projectedRows() {
        return jdbc.queryForObject("SELECT count(*) FROM prediction_run_projection WHERE cell_values IS NOT NULL"
                + " AND prediction_run_id = ANY(?)", Long.class, (Object) runs().toArray(Long[]::new));
    }

    /** Every stored row of the database, as one value. */
    private String checksum() {
        return jdbc.queryForObject("SELECT count(*) || ':' || coalesce(sum(hashtext(k::text)), 0) FROM prediction_run_projection k",
                String.class);
    }

    private static long payloadReads(List<String> statements) {
        return statements.stream().filter(sql -> sql.contains("prediction_result")).count();
    }

    private PredictionResultFeedback answer(PredictionResult result, String assessment) {
        return new PredictionResultFeedback(result, principals.of(owner), PredictionResultFeedbackType.OUTPUT, 0,
                objectMapper.valueToTree(Map.of("output-feedback-assessment", assessment)));
    }

    private String age() {
        return schema.getId() + ":input:Age";
    }

    private InferenceCatalogRequest request(int page, String sort, String locale) {
        return new InferenceCatalogRequest(page, 10, "", String.valueOf(schema.getId()), "all", "all", "all", "all",
                sort, locale, List.of());
    }

    /** A run goes with its results, in one transaction. */
    private void deleteRun(Long run) {
        inTransaction(() -> {
            jdbc.update("DELETE FROM prediction_result WHERE prediction_run_id = ?", run);
            jdbc.update("DELETE FROM prediction_run WHERE id = ?", run);
        });
    }
}
