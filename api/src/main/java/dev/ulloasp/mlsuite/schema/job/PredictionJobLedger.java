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

import tools.jackson.core.JacksonException;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

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
            + "j.done_rows, j.failed_rows, COALESCE(u.full_name, p.former_label), j.created_at, j.updated_at, j.finished_at";
    /** The job's author, shown by their name, or by what their principal was left as once they are gone. */
    private static final String AUTHOR = " FROM prediction_job j JOIN principal p ON p.id = j.created_by_principal_id"
            + " LEFT JOIN app_user u ON u.id = p.user_id";
    private static final String OPEN = "('QUEUED', 'RUNNING')";
    private static final String FINISHED = " RETURNING id, organization_id, schema_bookmark_id,"
            + " (SELECT b.name FROM schema_bookmark b WHERE b.id = schema_bookmark_id),"
            + " (SELECT p.user_id FROM principal p WHERE p.id = created_by_principal_id),"
            + " total_rows, done_rows, failed_rows, (SELECT o.name FROM organization o WHERE o.id = organization_id)";

    private final JdbcTemplate jdbc;
    private final ObjectMapper objectMapper;

    /**
     * A claimed job: what its worker needs to run it as the member who started it, null once they
     * are gone. {@code started} tells a job's first claim from one that came back after a busy
     * runtime or a lost lease.
     */
    record Claim(Long id, Long organizationId, Long bookmarkId, Long schemaVersionId, Long userId, boolean started) {
    }

    /** A job this statement ended: what telling the member who started it takes. */
    record FinishedJob(Long id, Long organizationId, Long bookmarkId, String bookmarkName, Long userId, int totalRows,
            int doneRows, int failedRows, String organizationName) {
    }

    /** A row still to run, with the record each model receives. */
    record PendingRow(int index, String name, Map<String, Object> inputData, Map<Long, Map<String, Object>> models) {
    }

    long insert(Long organizationId, Long bookmarkId, Long schemaVersionId, Long userId,
            List<CreatePredictionJobRequest.PredictionJobRow> rows) {
        Long id = jdbc.queryForObject("""
                INSERT INTO prediction_job (organization_id, schema_id, schema_bookmark_id, schema_version_id,
                    created_by_principal_id, updated_by_principal_id, status, total_rows, created_at, updated_at)
                SELECT ?, b.schema_id, b.id, ?, p.id, p.id, 'QUEUED', ?, now(), now()
                FROM principal p, schema_bookmark b WHERE p.user_id = ? AND b.id = ?
                RETURNING id""", Long.class,
                organizationId, schemaVersionId, rows.size(), userId, bookmarkId);
        List<Object[]> values = new ArrayList<>(rows.size());
        for (int index = 0; index < rows.size(); index++) {
            CreatePredictionJobRequest.PredictionJobRow row = rows.get(index);
            values.add(new Object[] { id, schemaVersionId, index, row.name(), json(row.inputData()), json(row.models()) });
        }
        jdbc.batchUpdate("""
                INSERT INTO prediction_job_row (prediction_job_id, schema_version_id, row_index, name, input_data,
                    model_inputs, status)
                VALUES (?, ?, ?, ?, ?::jsonb, ?::jsonb, 'PENDING')""", values);
        return id;
    }

    int countOpen(Long organizationId) {
        return jdbc.queryForObject("SELECT count(*) FROM prediction_job WHERE organization_id = ? AND status IN " + OPEN,
                Integer.class, organizationId);
    }

    int countOpenOf(Long organizationId, Long userId) {
        return jdbc.queryForObject("SELECT count(*) FROM prediction_job WHERE organization_id = ? AND created_by_principal_id = (SELECT id FROM principal WHERE user_id = ?)"
                + " AND status IN " + OPEN, Integer.class, organizationId, userId);
    }

    List<PredictionJobDto> list(Long organizationId, Long bookmarkId, int limit) {
        return jdbc.query("SELECT " + JOB_COLUMNS + AUTHOR
                + " WHERE j.organization_id = ? AND j.schema_bookmark_id = ? ORDER BY j.id DESC LIMIT ?",
                PredictionJobLedger::job, organizationId, bookmarkId, limit);
    }

    Optional<PredictionJobDto> find(Long organizationId, Long jobId) {
        return jdbc.query("SELECT " + JOB_COLUMNS + AUTHOR
                + " WHERE j.organization_id = ? AND j.id = ?", PredictionJobLedger::job, organizationId, jobId)
                .stream().findFirst();
    }

    List<PredictionJobFailureDto> failures(Long jobId) {
        return jdbc.query("SELECT row_index, name, error_message FROM prediction_job_row WHERE prediction_job_id = ? AND status = 'FAILED'"
                + " ORDER BY row_index", (rs, n) -> new PredictionJobFailureDto(rs.getInt(1), rs.getString(2),
                        rs.getString(3)), jobId);
    }

    /** Cancels an open job for {@code userId}; empty once it has finished. */
    Optional<FinishedJob> cancel(Long organizationId, Long jobId, Long userId) {
        return jdbc.query("UPDATE prediction_job SET status = 'CANCELLED', lease_owner = NULL, lease_expires_at = NULL,"
                + " finished_at = now(), updated_at = now(), updated_by_principal_id = (SELECT id FROM principal WHERE user_id = ?)"
                + " WHERE id = ? AND organization_id = ? AND status IN " + OPEN
                + FINISHED, PredictionJobLedger::finished, userId, jobId, organizationId).stream().findFirst();
    }

    /** Removes a finished job and its rows; false while it is open. */
    boolean delete(Long organizationId, Long jobId) {
        return jdbc.update("DELETE FROM prediction_job WHERE id = ? AND organization_id = ? AND status NOT IN " + OPEN,
                jobId, organizationId) == 1;
    }

    /** Puts a finished job's failed rows back to run; false when the job is still open. */
    boolean retry(Long organizationId, Long jobId, Long userId) {
        int reopened = jdbc.update("UPDATE prediction_job SET status = 'QUEUED', finished_at = NULL, stop_reason = NULL,"
                + " updated_at = now(),"
                + " updated_by_principal_id = (SELECT id FROM principal WHERE user_id = ?)"
                + " WHERE id = ? AND organization_id = ? AND status NOT IN " + OPEN, userId, jobId, organizationId);
        if (reopened == 0) return false;
        jdbc.update("UPDATE prediction_job_row SET status = 'PENDING', error_message = NULL WHERE prediction_job_id = ? AND status = 'FAILED'",
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
                RETURNING j.id, j.organization_id, j.schema_bookmark_id, j.schema_version_id,
                    (SELECT p.user_id FROM principal p WHERE p.id = j.created_by_principal_id),
                    next.status = 'QUEUED'""",
                (rs, n) -> new Claim(rs.getLong(1), rs.getLong(2), rs.getLong(3), rs.getLong(4),
                        rs.getObject(5, Long.class), rs.getBoolean(6)),
                worker, leaseSeconds).stream().findFirst();
    }

    /** Locks the job for its worker; false once it was cancelled or another worker took it over. */
    boolean holds(Long jobId, String worker) {
        return !jdbc.queryForList("SELECT id FROM prediction_job WHERE id = ? AND status = 'RUNNING' AND lease_owner = ?"
                + " FOR UPDATE", Long.class, jobId, worker).isEmpty();
    }

    List<PendingRow> pending(Long jobId, int limit) {
        return jdbc.query("SELECT row_index, name, input_data, model_inputs FROM prediction_job_row"
                + " WHERE prediction_job_id = ? AND status = 'PENDING' ORDER BY row_index LIMIT ?", this::pendingRow, jobId, limit);
    }

    void done(Long jobId, int rowIndex, Long runId) {
        jdbc.update("UPDATE prediction_job_row SET status = 'DONE', prediction_run_id = ?, error_message = NULL,"
                + " input_data = NULL, model_inputs = NULL"
                + " WHERE prediction_job_id = ? AND row_index = ?", runId, jobId, rowIndex);
    }

    void fail(Long jobId, int rowIndex, String error) {
        jdbc.update("UPDATE prediction_job_row SET status = 'FAILED', error_message = ? WHERE prediction_job_id = ? AND row_index = ?",
                error, jobId, rowIndex);
    }

    void failPending(Long jobId, String error) {
        jdbc.update("UPDATE prediction_job_row SET status = 'FAILED', error_message = ? WHERE prediction_job_id = ? AND status = 'PENDING'",
                error, jobId);
        refreshCounts(jobId);
    }

    /** Counts what the rows say, and renews the worker's lease when it holds one. */
    void refreshCounts(Long jobId, int leaseSeconds) {
        jdbc.update("""
                UPDATE prediction_job j SET updated_at = now(),
                    lease_expires_at = CASE WHEN j.lease_owner IS NULL THEN NULL ELSE now() + make_interval(secs => ?) END,
                    done_rows = (SELECT count(*) FROM prediction_job_row r WHERE r.prediction_job_id = j.id AND r.status = 'DONE'),
                    failed_rows = (SELECT count(*) FROM prediction_job_row r WHERE r.prediction_job_id = j.id AND r.status = 'FAILED')
                WHERE j.id = ?""", leaseSeconds, jobId);
    }

    void refreshCounts(Long jobId) {
        refreshCounts(jobId, 0);
    }

    /** Ends the job for the worker holding it; empty when that is no longer this worker. */
    Optional<FinishedJob> complete(Long jobId, String worker) {
        return complete(jobId, worker, null);
    }

    /** Ends the job, saying why the system stopped it when it did. */
    Optional<FinishedJob> complete(Long jobId, String worker, String stopReason) {
        return jdbc.query("UPDATE prediction_job j SET status = 'COMPLETED', lease_owner = NULL, lease_expires_at = NULL,"
                + " finished_at = now(), updated_at = now(), stop_reason = ?,"
                + " done_rows = (SELECT count(*) FROM prediction_job_row r WHERE r.prediction_job_id = j.id AND r.status = 'DONE'),"
                + " failed_rows = (SELECT count(*) FROM prediction_job_row r WHERE r.prediction_job_id = j.id AND r.status = 'FAILED')"
                + " WHERE id = ? AND lease_owner = ? AND status = 'RUNNING'"
                + FINISHED, PredictionJobLedger::finished, stopReason, jobId, worker).stream().findFirst();
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

    private static FinishedJob finished(ResultSet rs, int rowNumber) throws SQLException {
        return new FinishedJob(rs.getLong(1), rs.getLong(2), rs.getLong(3), rs.getString(4),
                rs.getObject(5, Long.class), rs.getInt(6), rs.getInt(7), rs.getInt(8), rs.getString(9));
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
        } catch (JacksonException ex) {
            throw new IllegalArgumentException("A bulk row is not serializable as JSON", ex);
        }
    }

    private <T> T read(String json, TypeReference<T> type) {
        try {
            return objectMapper.readValue(json, type);
        } catch (JacksonException ex) {
            throw new IllegalStateException("A stored bulk row is not valid JSON", ex);
        }
    }
}
