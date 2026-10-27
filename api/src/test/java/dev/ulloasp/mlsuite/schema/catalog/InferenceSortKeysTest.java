package dev.ulloasp.mlsuite.schema.catalog;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import dev.ulloasp.mlsuite.schema.PublicPredictionFixture;
import dev.ulloasp.mlsuite.schema.application.dto.PredictionRunCatalogItemDto;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRun;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRunStatus;

/**
 * A sort by a derived column is paged by the database from stored keys, and gives exactly the
 * order the table's own comparator gives (what a whole-result selection still computes in
 * memory): over text with accents, case and digit runs, numbers, booleans, JSON and missing
 * values, in several locales, both directions, with ties on creation time.
 */
class InferenceSortKeysTest extends PublicPredictionFixture {

    private static final List<Object> AGES = List.of("élan", "Elan", "elan", "ELAN", "file10", "file2", "file02",
            "Zebra", "zebra", "ñandú", "nandu", "Ärger", "ärger", "arg", "z", "å", "Ångström", "ı", "I", "i",
            "  spaced", "x-ray", "x ray", "xray", "10", "9", "-3", "1e3", 42, 7.5, -0.25, 0, 1000000, 3,
            true, false, Map.of("k", 1), List.of(1, 2), "", "😀", "中文", "日本");

    @Autowired InferenceCatalogService catalog;
    @Autowired JdbcTemplate jdbc;

    @BeforeEach
    void varedRuns() {
        authorizeOwner();
        OffsetDateTime at = OffsetDateTime.parse("2026-10-01T10:00:00Z");
        inTransaction(() -> {
            for (int i = 0; i < AGES.size(); i++) {
                Map<String, Object> inputs = new HashMap<>();
                inputs.put("Age", AGES.get(i));
                entityManager.persist(new PredictionRun(bookmark, version, "vary-" + i, inputs, PredictionRunStatus.SUCCESS));
            }
            for (int i = 0; i < 6; i++) {
                // Runs without the column, which go last in either direction.
                entityManager.persist(new PredictionRun(bookmark, version, "none-" + i, Map.of("Cholesterol", i),
                        PredictionRunStatus.SUCCESS));
            }
            entityManager.flush();
            // Half share one creation time, so ties fall back to the table's own order.
            entityManager.createQuery("update PredictionRun r set r.createdAt = :at where r.schemaVersion.id = :version"
                    + " and mod(r.id, 2) = 0").setParameter("at", at).setParameter("version", version.getId())
                    .executeUpdate();
        });
    }

    @ParameterizedTest
    @CsvSource({ "en-US,asc", "en-US,desc", "es-ES,asc", "de-DE,desc", "sv-SE,asc", "tr-TR,asc", "ja-JP,desc" })
    void theDatabaseOrdersADerivedColumnExactlyAsTheTableDoes(String locale, String direction) {
        String sort = schema.getId() + ":input:Age." + direction;

        List<Long> inMemory = catalog.selection(owner.getId(), request(0, sort, locale)).stream()
                .map(PredictionRunCatalogItemDto::id).toList();
        List<Long> paged = new ArrayList<>();
        for (int page = 0; page * 10 < inMemory.size(); page++) {
            var result = catalog.page(owner.getId(), request(page, sort, locale));
            assertEquals(inMemory.size(), result.totalItems());
            result.items().forEach(row -> paged.add(row.item().id()));
        }

        assertEquals(inMemory, paged);
        assertTrue(jdbc.queryForObject("SELECT count(*) FROM inference_sort_run WHERE locale LIKE ?", Long.class,
                locale.split("-")[0] + "%") >= AGES.size());
    }

    @ParameterizedTest
    @CsvSource({ "feedbackStatus.asc" })
    void aRunWithANewerAnswerRevisionIsRankedAgain(String sort) {
        catalog.page(owner.getId(), request(0, sort, "en-US"));
        Long runId = jdbc.queryForObject("SELECT id FROM prediction_run WHERE name = 'vary-0' AND schema_version_id = ?",
                Long.class, version.getId());
        Long resultId = inTransactionReturning(runId);
        jdbc.update("""
                INSERT INTO prediction_result_feedback_revision (feedback_id, prediction_result_id, feedback_type, orden,
                    change, changed_at) VALUES (1, ?, 'OUTPUT', 0, 'DELETED', now())""", resultId);
        Long newest = jdbc.queryForObject("SELECT max(id) FROM prediction_result_feedback_revision", Long.class);

        catalog.page(owner.getId(), request(0, sort, "en-US"));

        assertEquals(newest, jdbc.queryForObject("SELECT revision_mark FROM inference_sort_run WHERE prediction_run_id = ?"
                + " AND locale LIKE 'en-US|%'", Long.class, runId));
    }

    private Long inTransactionReturning(Long runId) {
        return jdbc.queryForObject("""
                INSERT INTO prediction_result (prediction_run_id, model_id, status, model_input_json, output_json, created_at)
                VALUES (?, ?, 'SUCCESS', '{}'::jsonb, '{}'::jsonb, now()) RETURNING id""", Long.class, runId,
                forestModel.getId());
    }

    private InferenceCatalogRequest request(int page, String sort, String locale) {
        return new InferenceCatalogRequest(page, 10, "", String.valueOf(schema.getId()), "all", "all", "all", "all",
                sort, locale, List.of());
    }
}
