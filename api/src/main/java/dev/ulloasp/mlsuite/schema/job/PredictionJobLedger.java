package dev.ulloasp.mlsuite.schema.job;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;

/**
 * The bulk jobs' tables, read and written in plain SQL. A worker claims a job with
 * {@code FOR UPDATE SKIP LOCKED}, so two workers never take the same one, and holds it under a
 * lease it renews after each chunk; a job whose lease lapsed (its worker crashed or restarted) is
 * claimed again. Methods run in the caller's transaction.
 */
@Component
@RequiredArgsConstructor
class PredictionJobLedger {

    private static final String JOB_COLUMNS = "j.id, j.schema_bookmark_id, j.schema_version_id, j.status, j.total_rows, "
            + "j.done_rows, j.failed_rows, u.full_name, j.created_at, j.updated_at, j.finished_at";
    private static final String OPEN = "('QUEUED', 'RUNNING')";

    private final JdbcTemplate jdbc;
    private final ObjectMapper objectMapper;

    /**
     * A claimed job: what its worker needs to run it as the member who started it. {@code started}
     * tells a job's first claim from one that came back after a busy runtime or a lost lease.
     */
    record Claim(Long id, Long organizationId, Long bookmarkId, Long schemaVersionId, Long userId, boolean started) {
    }

    /** What a finished job did. */
    record Outcome(int doneRows, int failedRows) {
    }

    /** A row still to run, with the record each model receives. */
    record PendingRow(int index, String name, Map<String, Object> inputData, Map<Long, Map<String, Object>> models) {
    }

    long insert(Long organizationId, Long bookmarkId, Long schemaVersionId, Long userId,
            List<CreatePredictionJobRequest.PredictionJobRow> rows) {
        Long id = jdbc.queryForObject("""
                INSERT INTO prediction_job (organization_id, schema_bookmark_id, schema_version_id, created_by_user_id,
                    status, total_rows, created_at, updated_at)
                VALUES (?, ?, ?, ?, 'QUEUED', ?, now(), now()) RETURNING id""", Long.class,
                organizationId, bookmarkId, schemaVersionId, userId, rows.size());
        List<Object[]> values = new ArrayList<>(rows.size());
        for (int index = 0; index < rows.size(); index++) {
            CreatePredictionJobRequest.PredictionJobRow row = rows.get(index);
            values.add(new Object[] { id, index, row.name(), json(row.inputData()), json(row.models()) });
        }
        jdbc.batchUpdate("""
                INSERT INTO prediction_job_row (job_id, row_index, name, input_data, model_inputs, status)
                VALUES (?, ?, ?, ?::jsonb, ?::jsonb, 'PENDING')""", values);
        return id;
    }

    int countOpen(Long organizationId) {
        return jdbc.queryForObject("SELECT count(*) FROM prediction_job WHERE organization_id = ? AND status IN " + OPEN,
                Integer.class, organizationId);
    }

    int countOpenOf(Long organizationId, Long userId) {
        return jdbc.queryForObject("SELECT count(*) FROM prediction_job WHERE organization_id = ? AND created_by_user_id = ?"
                + " AND status IN " + OPEN, Integer.class, organizationId, userId);
    }

    List<PredictionJobDto> list(Long organizationId, Long bookmarkId, int limit) {
        return jdbc.query("SELECT " + JOB_COLUMNS + " FROM prediction_job j JOIN app_user u ON u.id = j.created_by_user_id"
                + " WHERE j.organization_id = ? AND j.schema_bookmark_id = ? ORDER BY j.id DESC LIMIT ?",
                PredictionJobLedger::job, organizationId, bookmarkId, limit);
    }

    Optional<PredictionJobDto> find(Long organizationId, Long jobId) {
        return jdbc.query("SELECT " + JOB_COLUMNS + " FROM prediction_job j JOIN app_user u ON u.id = j.created_by_user_id"
                + " WHERE j.organization_id = ? AND j.id = ?", PredictionJobLedger::job, organizationId, jobId)
                .stream().findFirst();
    }

    List<PredictionJobFailureDto> failures(Long jobId) {
        return jdbc.query("SELECT row_index, name, error FROM prediction_job_row WHERE job_id = ? AND status = 'FAILED'"
                + " ORDER BY row_index", (rs, n) -> new PredictionJobFailureDto(rs.getInt(1), rs.getString(2),
                        rs.getString(3)), jobId);
    }

    boolean cancel(Long organizationId, Long jobId) {
        return jdbc.update("UPDATE prediction_job SET status = 'CANCELLED', lease_owner = NULL, lease_expires_at = NULL,"
                + " finished_at = now(), updated_at = now() WHERE id = ? AND organization_id = ? AND status IN " + OPEN,
                jobId, organizationId) == 1;
    }

    /** Puts a finished job's failed rows back to run; false when the job is still open. */
    boolean retry(Long organizationId, Long jobId) {
        int reopened = jdbc.update("UPDATE prediction_job SET status = 'QUEUED', finished_at = NULL, updated_at = now()"
                + " WHERE id = ? AND organization_id = ? AND status NOT IN " + OPEN, jobId, organizationId);
        if (reopened == 0) return false;
        jdbc.update("UPDATE prediction_job_row SET status = 'PENDING', error = NULL WHERE job_id = ? AND status = 'FAILED'",
                jobId);
        refreshCounts(jobId);
        return true;
    }

    Optional<Claim> claim(String worker, int leaseSeconds) {
        return jdbc.query("""
                WITH next AS (SELECT id, status FROM prediction_job WHERE status IN ('QUEUED', 'RUNNING')
                              AND (lease_expires_at IS NULL OR lease_expires_at < now())
                              ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED)
                UPDATE prediction_job j SET status = 'RUNNING', lease_owner = ?, updated_at = now(),
                    lease_expires_at = now() + make_interval(secs => ?)
                FROM next WHERE j.id = next.id
                RETURNING j.id, j.organization_id, j.schema_bookmark_id, j.schema_version_id, j.created_by_user_id,
                    next.status = 'QUEUED'""",
                (rs, n) -> new Claim(rs.getLong(1), rs.getLong(2), rs.getLong(3), rs.getLong(4), rs.getLong(5),
                        rs.getBoolean(6)),
                worker, leaseSeconds).stream().findFirst();
    }

    /** Locks the job for its worker; false once it was cancelled or another worker took it over. */
    boolean holds(Long jobId, String worker) {
        return !jdbc.queryForList("SELECT id FROM prediction_job WHERE id = ? AND status = 'RUNNING' AND lease_owner = ?"
                + " FOR UPDATE", Long.class, jobId, worker).isEmpty();
    }

    List<PendingRow> pending(Long jobId, int limit) {
        return jdbc.query("SELECT row_index, name, input_data, model_inputs FROM prediction_job_row"
                + " WHERE job_id = ? AND status = 'PENDING' ORDER BY row_index LIMIT ?", this::pendingRow, jobId, limit);
    }

    void done(Long jobId, int rowIndex, Long runId) {
        jdbc.update("UPDATE prediction_job_row SET status = 'DONE', prediction_run_id = ?, error = NULL"
                + " WHERE job_id = ? AND row_index = ?", runId, jobId, rowIndex);
    }

    void fail(Long jobId, int rowIndex, String error) {
        jdbc.update("UPDATE prediction_job_row SET status = 'FAILED', error = ? WHERE job_id = ? AND row_index = ?",
                error, jobId, rowIndex);
    }

    void failPending(Long jobId, String error) {
        jdbc.update("UPDATE prediction_job_row SET status = 'FAILED', error = ? WHERE job_id = ? AND status = 'PENDING'",
                error, jobId);
        refreshCounts(jobId);
    }

    /** Counts what the rows say, and renews the worker's lease when it holds one. */
    void refreshCounts(Long jobId, int leaseSeconds) {
        jdbc.update("""
                UPDATE prediction_job j SET updated_at = now(),
                    lease_expires_at = CASE WHEN j.lease_owner IS NULL THEN NULL ELSE now() + make_interval(secs => ?) END,
                    done_rows = (SELECT count(*) FROM prediction_job_row r WHERE r.job_id = j.id AND r.status = 'DONE'),
                    failed_rows = (SELECT count(*) FROM prediction_job_row r WHERE r.job_id = j.id AND r.status = 'FAILED')
                WHERE j.id = ?""", leaseSeconds, jobId);
    }

    void refreshCounts(Long jobId) {
        refreshCounts(jobId, 0);
    }

    /** Finishes the job; empty when it is no longer this worker's. */
    Optional<Outcome> complete(Long jobId, String worker) {
        return jdbc.query("UPDATE prediction_job SET status = 'COMPLETED', lease_owner = NULL, lease_expires_at = NULL,"
                + " finished_at = now(), updated_at = now() WHERE id = ? AND lease_owner = ? AND status = 'RUNNING'"
                + " RETURNING done_rows, failed_rows", (rs, n) -> new Outcome(rs.getInt(1), rs.getInt(2)),
                jobId, worker).stream().findFirst();
    }

    boolean cancelled(Long jobId) {
        return !jdbc.queryForList("SELECT id FROM prediction_job WHERE id = ? AND status = 'CANCELLED'", Long.class,
                jobId).isEmpty();
    }

    /** Hands the job back to be claimed at once, by this worker or another. */
    void release(Long jobId, String worker) {
        jdbc.update("UPDATE prediction_job SET lease_expires_at = now() WHERE id = ? AND lease_owner = ?", jobId, worker);
    }

    private static PredictionJobDto job(ResultSet rs, int rowNumber) throws SQLException {
        int total = rs.getInt(5);
        int done = rs.getInt(6);
        int failed = rs.getInt(7);
        return new PredictionJobDto(rs.getLong(1), rs.getLong(2), rs.getLong(3),
                PredictionJobStatus.valueOf(rs.getString(4)), total, done, failed, total - done - failed,
                rs.getString(8), rs.getObject(9, OffsetDateTime.class), rs.getObject(10, OffsetDateTime.class),
                rs.getObject(11, OffsetDateTime.class));
    }

    private PendingRow pendingRow(ResultSet rs, int rowNumber) throws SQLException {
        List<CreatePredictionJobRequest.PredictionJobModelInput> models = read(rs.getString(4), new TypeReference<>() {
        });
        Map<Long, Map<String, Object>> byModel = new LinkedHashMap<>();
        models.forEach(model -> byModel.put(model.modelId(), model.modelInput()));
        return new PendingRow(rs.getInt(1), rs.getString(2), read(rs.getString(3), new TypeReference<>() {
        }), byModel);
    }

    private String json(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            throw new IllegalArgumentException("A bulk row is not serializable as JSON", ex);
        }
    }

    private <T> T read(String json, TypeReference<T> type) {
        try {
            return objectMapper.readValue(json, type);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("A stored bulk row is not valid JSON", ex);
        }
    }
}
