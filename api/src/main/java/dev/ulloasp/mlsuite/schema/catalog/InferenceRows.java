package dev.ulloasp.mlsuite.schema.catalog;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import dev.ulloasp.mlsuite.schema.catalog.InferenceRowProjector.Row;
import lombok.RequiredArgsConstructor;

/**
 * Each run's projection as the inferences table derives it, kept so a sort or the table's columns
 * read stored rows instead of every run's payloads: the raw value of each data column, the feedback
 * status, and a digest of the run's columns. Nothing here depends on the locale; a reader formats
 * and collates what it reads. A row is current while nothing it was projected from has changed: the
 * projection, the run's answers, which count their changes here as they are written, and the names
 * of its snapshot's models, which decide how reports route. Projections are written only by
 * InferenceRowRefresher; a reader projects a run without a current row itself.
 */
@Component
@RequiredArgsConstructor
public class InferenceRows {

    /**
     * The version of what a projected row holds. Bump it whenever InferenceRowProjector changes what
     * a run shows: rows of another version are not current, and the refresh projects them again.
     */
    static final int PROJECTION_VERSION = 1;
    private static final ObjectMapper JSON = new ObjectMapper();
    /** How each snapshot's models are named now, as a row records it. */
    private static final String STAMPS = """
            WITH stamps AS (SELECT b.schema_version_id AS id, string_agg(b.model_id || ':' || m.name, ',' ORDER BY b.id) AS models
                FROM schema_model_binding b JOIN model m ON m.id = b.model_id GROUP BY b.schema_version_id)
            """;
    /** Whether row k, of a run whose snapshot is named st, is current. */
    private static final String CURRENT = """
            coalesce(k.projection_version = %d AND k.projected_changes = k.answer_changes
                AND k.models_stamp = coalesce(st.models, ''), false)""".formatted(PROJECTION_VERSION);

    private final JdbcTemplate jdbc;

    /** What a run's row is projected from: read before its payloads, so a change made meanwhile leaves it stale. */
    record Source(long changes, String models) {
    }

    /** One column of the current rows among some runs, and the runs without a current row. */
    record Column(Map<Long, Object> values, Map<Long, InferenceFeedbackStatus> statuses, Set<Long> stale) {
    }

    /** Counts a change of the run's answers, in the transaction that makes it: its row is no longer current. */
    public void answersChanged(Long runId) {
        jdbc.update("""
                INSERT INTO inference_row (prediction_run_id, answer_changes) VALUES (?, 1)
                ON CONFLICT (prediction_run_id) DO UPDATE SET answer_changes = inference_row.answer_changes + 1""",
                runId);
    }

    /** The given runs without a current row. */
    Set<Long> stale(List<Long> ids) {
        Set<Long> stale = new HashSet<>();
        if (!ids.isEmpty()) {
            jdbc.query(connection -> statement(connection, STAMPS + """
                    SELECT s.id FROM unnest(?::bigint[]) AS s(id) LEFT JOIN inference_row k ON k.prediction_run_id = s.id
                    LEFT JOIN stamps st ON st.id = k.schema_version_id WHERE NOT %s""".formatted(CURRENT), ids),
                    rs -> {
                        stale.add(rs.getLong(1));
                    });
        }
        return stale;
    }

    /** A data column's raw value (absent when the run does not show it) and each run's feedback status. */
    Column column(List<Long> ids, String column) {
        Column read = new Column(new HashMap<>(), new HashMap<>(), new HashSet<>());
        if (ids.isEmpty()) {
            return read;
        }
        jdbc.query(connection -> {
            PreparedStatement statement = statement(connection, STAMPS + """
                    SELECT s.id, %s, k.cell_values -> ?, k.feedback_status
                    FROM unnest(?::bigint[]) AS s(id) LEFT JOIN inference_row k ON k.prediction_run_id = s.id
                    LEFT JOIN stamps st ON st.id = k.schema_version_id""".formatted(CURRENT), ids, 2);
            statement.setString(1, column);
            return statement;
        }, rs -> {
            long id = rs.getLong(1);
            if (!rs.getBoolean(2)) {
                read.stale().add(id);
                return;
            }
            String value = rs.getString(3);
            if (value != null) {
                read.values().put(id, parse(value));
            }
            read.statuses().put(id, InferenceFeedbackStatus.valueOf(rs.getString(4)));
        });
        return read;
    }

    /** Of runs with current rows, in the table's order, the first run of each distinct set of columns. */
    List<Long> leaders(List<Long> ids) {
        if (ids.isEmpty()) {
            return List.of();
        }
        return jdbc.query(connection -> statement(connection, """
                SELECT first.id FROM (SELECT DISTINCT ON (k.layout) s.id, s.n
                    FROM unnest(?::bigint[]) WITH ORDINALITY AS s(id, n) JOIN inference_row k ON k.prediction_run_id = s.id
                    ORDER BY k.layout, s.n) first
                ORDER BY first.n""", ids), (rs, n) -> rs.getLong(1));
    }

    /** Every distinct value each data column holds among runs with current rows. */
    List<Map.Entry<String, Object>> distinctValues(List<Long> ids) {
        if (ids.isEmpty()) {
            return List.of();
        }
        return jdbc.query(connection -> statement(connection, """
                SELECT e.key, e.value FROM unnest(?::bigint[]) AS s(id)
                JOIN inference_row k ON k.prediction_run_id = s.id CROSS JOIN jsonb_each(k.cell_values) AS e
                GROUP BY e.key, e.value""", ids), (rs, n) -> Map.entry(rs.getString(1), parse(rs.getString(2))));
    }

    /** Up to {@code limit} runs of any organization without a current row, newest first, with their organization. */
    Map<Long, Long> staleRuns(int limit) {
        Map<Long, Long> stale = new LinkedHashMap<>();
        jdbc.query(STAMPS + """
                SELECT r.id, s.organization_id FROM prediction_run r
                JOIN schema_version v ON v.id = r.schema_version_id JOIN schema_artifact s ON s.id = v.schema_id
                LEFT JOIN inference_row k ON k.prediction_run_id = r.id LEFT JOIN stamps st ON st.id = r.schema_version_id
                WHERE NOT %s ORDER BY r.id DESC LIMIT %d""".formatted(CURRENT, limit), rs -> {
            stale.put(rs.getLong(1), rs.getLong(2));
        });
        return stale;
    }

    /** What the given runs' rows are projected from right now. */
    Map<Long, Source> sources(List<Long> ids) {
        Map<Long, Source> sources = new HashMap<>();
        jdbc.query(connection -> statement(connection, STAMPS + """
                SELECT r.id, coalesce(k.answer_changes, 0), coalesce(st.models, '')
                FROM unnest(?::bigint[]) AS s(id) JOIN prediction_run r ON r.id = s.id
                LEFT JOIN inference_row k ON k.prediction_run_id = r.id LEFT JOIN stamps st ON st.id = r.schema_version_id""",
                ids), rs -> {
            sources.put(rs.getLong(1), new Source(rs.getLong(2), rs.getString(3)));
        });
        return sources;
    }

    /**
     * Stores the projections of runs that still exist, as projected from {@code sources}. The count
     * of answer changes is never written here: one counted meanwhile keeps the row stale.
     */
    void store(List<Row> rows, Map<Long, Source> sources) {
        List<Row> kept = rows.stream().filter(row -> sources.containsKey(row.dto().item().id())).toList();
        if (kept.isEmpty()) {
            return;
        }
        List<Object> ids = new ArrayList<>();
        List<Object> changes = new ArrayList<>();
        List<Object> versions = new ArrayList<>();
        List<Object> models = new ArrayList<>();
        List<Object> layouts = new ArrayList<>();
        List<Object> statuses = new ArrayList<>();
        List<Object> values = new ArrayList<>();
        for (Row row : kept) {
            Source source = sources.get(row.dto().item().id());
            ids.add(row.dto().item().id());
            changes.add(source.changes());
            versions.add(row.dto().item().schemaVersionId());
            models.add(source.models());
            layouts.add(layout(row));
            statuses.add(row.dto().feedbackStatus().name());
            values.add(json(row.dto().values()));
        }
        jdbc.update(connection -> {
            var statement = connection.prepareStatement("""
                    INSERT INTO inference_row (prediction_run_id, projected_changes, projection_version, schema_version_id,
                        models_stamp, layout, feedback_status, cell_values)
                    SELECT u.id, u.changes, ?, u.version, u.models, u.layout, u.status, u.cell_values::jsonb
                    FROM unnest(?::bigint[], ?::bigint[], ?::bigint[], ?::text[], ?::text[], ?::text[], ?::text[])
                        AS u(id, changes, version, models, layout, status, cell_values)
                    WHERE EXISTS (SELECT 1 FROM prediction_run r WHERE r.id = u.id)
                    ON CONFLICT (prediction_run_id) DO UPDATE SET projected_changes = excluded.projected_changes,
                        projection_version = excluded.projection_version, schema_version_id = excluded.schema_version_id,
                        models_stamp = excluded.models_stamp, layout = excluded.layout,
                        feedback_status = excluded.feedback_status, cell_values = excluded.cell_values""");
            statement.setInt(1, PROJECTION_VERSION);
            int index = 2;
            for (var array : List.of(ids, changes, versions)) {
                statement.setArray(index++, connection.createArrayOf("bigint", array.toArray()));
            }
            for (var array : List.of(models, layouts, statuses, values)) {
                statement.setArray(index++, connection.createArrayOf("text", array.toArray()));
            }
            return statement;
        });
    }

    /** The run's snapshot and its columns' ids and groups: runs with equal digests have the same columns. */
    private static String layout(Row row) {
        StringBuilder text = new StringBuilder(String.valueOf(row.dto().item().schemaVersionId()));
        row.columns().forEach(column -> text.append('\n').append(column.id()).append('\u0000').append(column.group()));
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(text.toString().getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException missing) {
            throw new IllegalStateException(missing);
        }
    }

    private static String json(Object value) {
        try {
            return JSON.writeValueAsString(value);
        } catch (JsonProcessingException unwritable) {
            throw new IllegalStateException(unwritable);
        }
    }

    private static Object parse(String json) {
        try {
            return JSON.readValue(json, Object.class);
        } catch (JsonProcessingException unreadable) {
            throw new IllegalStateException(unreadable);
        }
    }

    private static PreparedStatement statement(Connection connection, String sql, List<Long> ids) throws SQLException {
        return statement(connection, sql, ids, 1);
    }

    private static PreparedStatement statement(Connection connection, String sql, List<Long> ids, int index)
            throws SQLException {
        PreparedStatement statement = connection.prepareStatement(sql);
        statement.setArray(index, connection.createArrayOf("bigint", ids.toArray()));
        return statement;
    }
}
