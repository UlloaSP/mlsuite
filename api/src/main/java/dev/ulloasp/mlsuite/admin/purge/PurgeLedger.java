package dev.ulloasp.mlsuite.admin.purge;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
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
 * The purge jobs' table, each transition one statement. A worker claims a job with
 * {@code FOR UPDATE SKIP LOCKED} and holds it under a lease it renews with every batch, so two
 * workers never run one job and a crashed worker's job is claimed again from the phase it wrote
 * down. A worker that lost its lease changes nothing: every write names it.
 */
@Component
@RequiredArgsConstructor
class PurgeLedger {

    private static final String COLUMNS = """
            id, scope, target_id, target_label, requested_by_label, status, phase, counts, error,
            created_at, updated_at, finished_at""";
    private static final String UNFINISHED = "status <> 'COMPLETED'";
    private static final String MATCHING = """
             WHERE lower(target_label) LIKE ? ESCAPE '!'
            AND (? = 'all' OR (? = 'open' AND status <> 'COMPLETED') OR (? = 'completed' AND status = 'COMPLETED'))""";

    private final JdbcTemplate jdbc;
    private final ObjectMapper objectMapper;

    Long insert(PurgeTargets.Target target, Long requestedBy, String requestedByLabel) {
        return jdbc.queryForObject("""
                INSERT INTO purge_job (scope, target_id, target_label, organization_id, requested_by_user_id,
                    requested_by_label, status, phase, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, 'QUEUED', 'PREPARE', now(), now()) RETURNING id""", Long.class,
                target.scope().name(), target.id(), target.label(), target.organizationId(), requestedBy,
                requestedByLabel);
    }

    boolean isOpen(PurgeScope scope, Long targetId) {
        return Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS (SELECT 1 FROM purge_job WHERE scope = ?"
                + " AND target_id = ? AND " + UNFINISHED + ")", Boolean.class, scope.name(), targetId));
    }

    boolean isOpenIn(Long organizationId) {
        return Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS (SELECT 1 FROM purge_job WHERE organization_id = ?"
                + " AND " + UNFINISHED + ")", Boolean.class, organizationId));
    }

    Optional<PurgeJob> claim(String worker, int leaseSeconds) {
        return jdbc.query("""
                WITH next AS (SELECT id FROM purge_job WHERE status IN ('QUEUED', 'RUNNING')
                              AND (lease_expires_at IS NULL OR lease_expires_at < now())
                              ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED)
                UPDATE purge_job j SET status = 'RUNNING', lease_owner = ?, updated_at = now(),
                    lease_expires_at = now() + make_interval(secs => ?)
                FROM next WHERE j.id = next.id
                RETURNING j.id, j.scope, j.target_id, j.target_label, j.organization_id, j.requested_by_user_id, j.phase""",
                (rs, n) -> new PurgeJob(rs.getLong(1), PurgeScope.valueOf(rs.getString(2)), rs.getLong(3),
                        rs.getString(4), rs.getLong(5), rs.getObject(6, Long.class), PurgePhase.valueOf(rs.getString(7))),
                worker, leaseSeconds).stream().findFirst();
    }

    /** Locks the job for its worker and extends the lease; false once it is no longer theirs. */
    boolean renew(Long jobId, String worker, int leaseSeconds) {
        return jdbc.update("""
                UPDATE purge_job SET lease_expires_at = now() + make_interval(secs => ?), updated_at = now()
                WHERE id = ? AND lease_owner = ? AND status = 'RUNNING'""", leaseSeconds, jobId, worker) == 1;
    }

    void reach(Long jobId, PurgePhase phase) {
        jdbc.update("UPDATE purge_job SET phase = ? WHERE id = ?", phase.name(), jobId);
    }

    void add(Long jobId, String counter, int rows) {
        jdbc.update("""
                UPDATE purge_job SET counts = jsonb_set(counts, ARRAY[?],
                    to_jsonb(COALESCE((counts ->> ?)::bigint, 0) + ?)) WHERE id = ?""", counter, counter, rows, jobId);
    }

    void finish(Long jobId) {
        jdbc.update("""
                UPDATE purge_job SET status = 'COMPLETED', error = NULL, lease_owner = NULL, lease_expires_at = NULL,
                    finished_at = now(), updated_at = now() WHERE id = ?""", jobId);
    }

    /** False when the job is no longer this worker's, which then reports nothing. */
    boolean fail(Long jobId, String worker, String error) {
        return jdbc.update("""
                UPDATE purge_job SET status = 'FAILED', error = ?, lease_owner = NULL, lease_expires_at = NULL,
                    finished_at = now(), updated_at = now()
                WHERE id = ? AND lease_owner = ? AND status = 'RUNNING'""", error, jobId, worker) == 1;
    }

    /** A retry starts over: every phase finds only what is left. */
    boolean retry(Long jobId) {
        return jdbc.update("""
                UPDATE purge_job SET status = 'QUEUED', phase = 'PREPARE', error = NULL, finished_at = NULL,
                    updated_at = now() WHERE id = ? AND status = 'FAILED'""", jobId) == 1;
    }

    Optional<PurgeJobDto> find(Long jobId) {
        return jdbc.query("SELECT " + COLUMNS + " FROM purge_job WHERE id = ?", this::job, jobId).stream().findFirst();
    }

    long count(String search, String filter) {
        return jdbc.queryForObject("SELECT count(*) FROM purge_job" + MATCHING, Long.class, search, filter, filter, filter);
    }

    /** {@code filter} is "open" (not ended, or failed), "completed" or "all"; any other matches nothing. */
    List<PurgeJobDto> page(String search, String filter, int page, int size) {
        return jdbc.query("SELECT " + COLUMNS + " FROM purge_job" + MATCHING + " ORDER BY id DESC LIMIT ? OFFSET ?",
                this::job, search, filter, filter, filter, size, (long) page * size);
    }

    private PurgeJobDto job(ResultSet rs, int rowNumber) throws SQLException {
        PurgePhase phase = PurgePhase.valueOf(rs.getString(7));
        return new PurgeJobDto(rs.getLong(1), PurgeScope.valueOf(rs.getString(2)), rs.getLong(3), rs.getString(4),
                rs.getString(5), PurgeStatus.valueOf(rs.getString(6)), phase, phase.ordinal() + 1,
                PurgePhase.values().length, counts(rs.getString(8)), rs.getString(9),
                rs.getObject(10, OffsetDateTime.class), rs.getObject(11, OffsetDateTime.class),
                rs.getObject(12, OffsetDateTime.class));
    }

    private Map<String, Long> counts(String json) {
        try {
            return objectMapper.readValue(json, new TypeReference<>() {
            });
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("A purge's stored counts are not valid JSON", ex);
        }
    }
}
