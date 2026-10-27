package dev.ulloasp.mlsuite.schema.catalog;

import java.sql.Array;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.schema.catalog.InferenceCatalogOrder.Key;
import dev.ulloasp.mlsuite.schema.catalog.InferenceRowProjector.Row;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;
import lombok.RequiredArgsConstructor;

/**
 * Stored sort keys of derived columns, so a sort by an input, a report or an answer is paged by the
 * database instead of projecting every run of the scope. A key is exactly what the table compares
 * (InferenceCatalogOrder.derivedKey): a number, or the ICU collation key of the displayed text,
 * whose unsigned byte order (PostgreSQL's bytea order) is the collator's order. Runs never change
 * after they are saved; answers do, and every answer change adds a revision, so a run's keys are
 * computed again when it has a revision newer than the one they were computed after. Keys are
 * filled the first time a locale sorts a run.
 */
@Component
@RequiredArgsConstructor
class InferenceSortKeys {

    /**
     * The version of what a projected row shows and how it ranks. Bump it whenever
     * InferenceRowProjector or InferenceCatalogOrder.derivedKey change either: keys of another
     * version are never read.
     */
    static final int PROJECTION_VERSION = 1;
    private static final String FEEDBACK_STATUS = "feedbackStatus";

    private final JdbcTemplate jdbc;
    private final WorkspaceAuthorizationService authorization;
    private final InferenceCatalogQueries queries;
    private final InferenceCatalogReader reader;

    /**
     * Brings the keys of a scope's runs up to date and commits them, before the caller's own
     * snapshot is taken, so its page reads them.
     *
     * @return the scope's runs, newest first
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public List<Long> refresh(Long userId, InferenceCatalogScope scope, InferenceCatalogText text) {
        Long organizationId = authorization.requireCurrent(userId, PermissionKey.VIEW_MODELS).getId();
        List<Long> ids = queries.ids(organizationId, scope);
        Map<Long, Long> stale = stale(text.sortKeyLocale(), ids);
        if (!stale.isEmpty()) {
            InferenceRowProjector projector = new InferenceRowProjector(text);
            reader.selected(userId, new ArrayList<>(stale.keySet()),
                    table -> store(text, projector.project(table), stale));
        }
        return ids;
    }

    /** One page of the runs in the order of a derived column: the table's order, by the database. */
    @Transactional(readOnly = true)
    public List<Long> page(List<Long> ids, InferenceCatalogText text, InferenceCatalogOrder order, long offset, int limit) {
        String direction = order.descending() ? "DESC" : "ASC";
        // A run without the column goes last either way; numbers come before text ascending and
        // after it descending, as Key.compareTo reversed does; ties keep the table's own order.
        String sql = """
                SELECT s.id FROM unnest(?) AS s(id) JOIN prediction_run r ON r.id = s.id
                LEFT JOIN inference_sort_key k
                    ON k.locale = ? AND k.column_id = ? AND k.prediction_run_id = s.id
                ORDER BY k.prediction_run_id IS NULL, k.number_value IS NULL %1$s, k.number_value %1$s,
                    k.text_key %1$s, r.created_at DESC, r.id ASC
                OFFSET ? LIMIT ?""".formatted(direction);
        return jdbc.query(connection -> {
            var statement = connection.prepareStatement(sql);
            statement.setArray(1, array(connection, ids));
            statement.setString(2, text.sortKeyLocale());
            statement.setString(3, order.column());
            statement.setLong(4, offset);
            statement.setInt(5, limit);
            return statement;
        }, (rs, n) -> rs.getLong(1));
    }

    /** The runs whose keys are missing or older than their newest answer revision, with that revision. */
    private Map<Long, Long> stale(String locale, List<Long> ids) {
        Map<Long, Long> stale = new LinkedHashMap<>();
        if (ids.isEmpty()) return stale;
        jdbc.query(connection -> {
            var statement = connection.prepareStatement("""
                    WITH marks AS (SELECT res.prediction_run_id AS run_id, max(v.id) AS mark
                        FROM prediction_result_feedback_revision v
                        JOIN prediction_result res ON res.id = v.prediction_result_id GROUP BY res.prediction_run_id)
                    SELECT s.id, coalesce(m.mark, 0) FROM unnest(?) AS s(id)
                    LEFT JOIN marks m ON m.run_id = s.id
                    LEFT JOIN inference_sort_run k ON k.locale = ? AND k.prediction_run_id = s.id
                    WHERE k.prediction_run_id IS NULL OR k.revision_mark < coalesce(m.mark, 0)""");
            statement.setArray(1, array(connection, ids));
            statement.setString(2, locale);
            return statement;
        }, rs -> {
            stale.put(rs.getLong(1), rs.getLong(2));
        });
        return stale;
    }

    /**
     * Replaces the keys of projected runs. The revision a run's keys were computed after was read
     * before its answers were, so an answer written meanwhile makes them stale, never wrong.
     */
    private void store(InferenceCatalogText text, List<Row> rows, Map<Long, Long> marks) {
        String locale = text.sortKeyLocale();
        List<Object[]> runs = new ArrayList<>();
        List<Object[]> keys = new ArrayList<>();
        for (Row row : rows) {
            Long runId = row.dto().item().id();
            runs.add(new Object[] { locale, runId, marks.getOrDefault(runId, 0L) });
            Set<String> columns = new HashSet<>(row.dto().values().keySet());
            columns.addAll(row.dto().displayValues().keySet());
            columns.add(FEEDBACK_STATUS);
            for (String column : columns) {
                Key key = InferenceCatalogOrder.derivedKey(row.dto(), column, text);
                if (key == null) continue;
                keys.add(new Object[] { locale, column, runId, key.numeric() ? key.number() : null,
                        key.numeric() ? null : key.text().toByteArray() });
            }
        }
        jdbc.batchUpdate("DELETE FROM inference_sort_key WHERE locale = ? AND prediction_run_id = ?",
                runs.stream().map(run -> new Object[] { run[0], run[1] }).toList());
        jdbc.batchUpdate("""
                INSERT INTO inference_sort_key (locale, column_id, prediction_run_id, number_value, text_key)
                VALUES (?, ?, ?, ?, ?) ON CONFLICT (locale, column_id, prediction_run_id)
                DO UPDATE SET number_value = excluded.number_value, text_key = excluded.text_key""", keys);
        jdbc.batchUpdate("""
                INSERT INTO inference_sort_run (locale, prediction_run_id, revision_mark) VALUES (?, ?, ?)
                ON CONFLICT (locale, prediction_run_id) DO UPDATE SET revision_mark = excluded.revision_mark""", runs);
    }

    private static Array array(java.sql.Connection connection, List<Long> ids) throws java.sql.SQLException {
        return connection.createArrayOf("bigint", ids.toArray());
    }
}
