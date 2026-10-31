package dev.ulloasp.mlsuite.model.application.runtime;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import dev.ulloasp.mlsuite.audit.application.service.AuditLogService;
import dev.ulloasp.mlsuite.audit.domain.model.AuditAction;
import dev.ulloasp.mlsuite.audit.domain.model.AuditActor;
import dev.ulloasp.mlsuite.audit.domain.model.AuditDetails;
import dev.ulloasp.mlsuite.notification.application.service.NotificationService;
import dev.ulloasp.mlsuite.notification.domain.model.NotificationKind;
import lombok.RequiredArgsConstructor;

/**
 * A model's preparation state, each transition one SQL statement. A worker claims a PREPARING
 * model with {@code FOR UPDATE SKIP LOCKED} under a lease, so two API instances never prepare the
 * same model, and a model whose worker stopped is claimed again once its lease lapses. A failure
 * worth retrying leaves the model unclaimed until a later time, which is when it is claimed again.
 * The statement that ends a preparation records it and tells the member who uploaded the model, in
 * its transaction: a worker that lost its lease reports nothing, and neither does an attempt that
 * will be retried.
 */
@Component
@RequiredArgsConstructor
public class ModelPreparationLedger {

    private static final int MAX_ERROR = 2000;
    private static final String SETTLED = " RETURNING id, name, organization_id, user_id, runtime_state,"
            + " (SELECT o.name FROM organization o WHERE o.id = organization_id), environment_key";

    private final JdbcTemplate jdbc;
    private final ObjectMapper objectMapper;
    private final NotificationService notifications;
    private final AuditLogService auditLog;

    /** What reporting a preparation that just ended takes. */
    private record Settled(Long id, String name, Long organizationId, Long userId, String state,
            String organizationName, String environmentKey) {
    }

    Optional<Long> claim(String worker, int leaseSeconds) {
        return jdbc.query("""
                UPDATE model SET runtime_lease_owner = ?, runtime_lease_expires_at = now() + make_interval(secs => ?)
                WHERE id = (
                    SELECT id FROM model
                    WHERE runtime_state = 'PREPARING'
                    AND (runtime_lease_expires_at IS NULL OR runtime_lease_expires_at < now())
                    ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED)
                RETURNING id""", (rs, n) -> rs.getLong(1), worker, leaseSeconds).stream().findFirst();
    }

    @Transactional
    void ready(Long modelId, String worker, List<Map<String, Object>> featureImportances) {
        jdbc.query("""
                UPDATE model SET runtime_state = 'READY', feature_importances = ?::jsonb, runtime_error = NULL,
                    runtime_attempts = 0, runtime_lease_owner = NULL, runtime_lease_expires_at = NULL
                WHERE id = ? AND runtime_lease_owner = ?""" + SETTLED, ModelPreparationLedger::settled,
                json(featureImportances), modelId, worker).forEach(model -> {
                    auditLog.record(AuditActor.SYSTEM, model.organizationId(), AuditAction.MODEL_PREPARATION_READY,
                            model.id(), AuditDetails.of("environment", model.environmentKey()));
                    tell(model, NotificationKind.MODEL_READY,
                            Map.of("modelName", model.name(), "organizationName", model.organizationName()));
                });
    }

    @Transactional
    void fail(Long modelId, String worker, String reason) {
        jdbc.query("""
                UPDATE model SET runtime_state = 'FAILED', runtime_error = ?,
                    runtime_lease_owner = NULL, runtime_lease_expires_at = NULL
                WHERE id = ? AND runtime_lease_owner = ?""" + SETTLED, ModelPreparationLedger::settled,
                bounded(reason), modelId, worker).forEach(model -> reportFailure(model, reason));
    }

    /**
     * Counts a failed attempt: the model is claimed again after a delay that doubles from
     * {@code firstDelaySeconds} up to {@code maxDelaySeconds}, or FAILED with the reason once it
     * has had {@code maxAttempts}. Returns whether it failed for good.
     */
    @Transactional
    boolean retryOrFail(Long modelId, String worker, String reason, int maxAttempts, long firstDelaySeconds,
            long maxDelaySeconds) {
        Optional<Settled> failed = jdbc.query("""
                UPDATE model SET runtime_attempts = runtime_attempts + 1, runtime_error = ?,
                    runtime_state = CASE WHEN runtime_attempts + 1 >= ? THEN 'FAILED' ELSE 'PREPARING' END,
                    runtime_lease_owner = NULL,
                    runtime_lease_expires_at = CASE WHEN runtime_attempts + 1 >= ? THEN NULL
                        ELSE now() + make_interval(secs => LEAST(?, ? * power(2, runtime_attempts))) END
                WHERE id = ? AND runtime_lease_owner = ?""" + SETTLED, ModelPreparationLedger::settled,
                bounded(reason), maxAttempts, maxAttempts, (double) maxDelaySeconds, (double) firstDelaySeconds,
                modelId, worker).stream().filter(model -> "FAILED".equals(model.state())).findFirst();
        failed.ifPresent(model -> reportFailure(model, reason));
        return failed.isPresent();
    }

    /** A READY model whose environment the runtime no longer has is prepared again. */
    public void prepareAgain(Long modelId) {
        jdbc.update("""
                UPDATE model SET runtime_state = 'PREPARING', runtime_attempts = 0, runtime_error = NULL,
                    runtime_lease_owner = NULL, runtime_lease_expires_at = NULL
                WHERE id = ? AND runtime_state = 'READY'""", modelId);
    }

    /** A FAILED model is prepared again from its first attempt; false when it had not failed. */
    boolean retry(Long modelId) {
        return jdbc.update("""
                UPDATE model SET runtime_state = 'PREPARING', runtime_attempts = 0, runtime_error = NULL,
                    runtime_lease_owner = NULL, runtime_lease_expires_at = NULL
                WHERE id = ? AND runtime_state = 'FAILED'""", modelId) == 1;
    }

    private void reportFailure(Settled model, String reason) {
        auditLog.record(AuditActor.SYSTEM, model.organizationId(), AuditAction.MODEL_PREPARATION_FAILED, model.id(),
                AuditDetails.of("reason", reason));
        tell(model, NotificationKind.MODEL_FAILED, Map.of("modelName", model.name(), "reason", bounded(reason),
                "organizationName", model.organizationName()));
    }

    /** Nobody is told once the member who uploaded the model is gone. */
    private void tell(Settled model, NotificationKind kind, Map<String, Object> payload) {
        if (model.userId() != null) {
            notifications.notify(model.userId(), model.organizationId(), kind, model.id().toString(), payload);
        }
    }

    private static Settled settled(ResultSet rs, int rowNumber) throws SQLException {
        return new Settled(rs.getLong(1), rs.getString(2), rs.getLong(3), rs.getObject(4, Long.class), rs.getString(5),
                rs.getString(6), rs.getString(7));
    }

    private static String bounded(String reason) {
        String text = reason == null || reason.isBlank() ? "The environment could not be prepared" : reason;
        return text.length() <= MAX_ERROR ? text : text.substring(0, MAX_ERROR - 1) + "…";
    }

    private String json(List<Map<String, Object>> value) {
        if (value == null) return null;
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Feature importances are not serializable", ex);
        }
    }
}
