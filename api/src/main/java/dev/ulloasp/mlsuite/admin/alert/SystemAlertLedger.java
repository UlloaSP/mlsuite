package dev.ulloasp.mlsuite.admin.alert;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import dev.ulloasp.mlsuite.audit.application.service.AuditLogService;
import dev.ulloasp.mlsuite.audit.domain.model.AuditAction;
import dev.ulloasp.mlsuite.audit.domain.model.AuditActor;
import dev.ulloasp.mlsuite.audit.domain.model.AuditDetails;
import dev.ulloasp.mlsuite.notification.application.service.NotificationService;
import dev.ulloasp.mlsuite.notification.domain.model.NotificationKind;
import dev.ulloasp.mlsuite.user.adapter.out.persistence.repository.UserRepository;
import dev.ulloasp.mlsuite.user.domain.model.SystemRole;
import jakarta.annotation.Nullable;
import lombok.RequiredArgsConstructor;

/**
 * An alert's life, each transition one conditional SQL statement. Only the instance whose statement
 * changed the row reports it, in that transaction: the audit event and one notification to every
 * enabled superadmin stand exactly when the transition does. The partial unique index keeps one
 * alert open per signal, so instances raising at once insert one row between them.
 */
@Component
@RequiredArgsConstructor
public class SystemAlertLedger {

    private final JdbcTemplate jdbc;
    private final UserRepository users;
    private final NotificationService notifications;
    private final AuditLogService auditLog;

    Map<SystemAlertSignal, OpenSystemAlert> open() {
        Map<SystemAlertSignal, OpenSystemAlert> open = new EnumMap<>(SystemAlertSignal.class);
        jdbc.query("SELECT id, signal, severity, held_at FROM system_alert WHERE resolved_at IS NULL", row -> {
            SystemAlertSignal signal = SystemAlertSignal.valueOf(row.getString(2));
            open.put(signal, new OpenSystemAlert(row.getLong(1), signal,
                    SystemAlertSeverity.valueOf(row.getString(3)),
                    row.getObject(4, OffsetDateTime.class).toInstant()));
        });
        return open;
    }

    @Transactional
    void raise(SystemAlertSignal signal, SystemAlertSeverity severity, double value, double threshold, Instant now) {
        OffsetDateTime at = at(now);
        jdbc.query("""
                INSERT INTO system_alert (signal, severity, trigger_value, threshold, latest_value, raised_at, held_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (signal) WHERE resolved_at IS NULL DO NOTHING
                RETURNING id""", (row, number) -> row.getLong(1), signal.name(), severity.name(), value, threshold,
                value, at, at)
                .forEach(id -> report(NotificationKind.SYSTEM_ALERT_RAISED, AuditAction.SYSTEM_ALERT_RAISED, id, signal,
                        severity, value, threshold));
    }

    /** A warning becomes critical and stays so until it resolves; the value and threshold follow. */
    @Transactional
    void escalate(OpenSystemAlert alert, double value, double threshold, Instant now) {
        int changed = jdbc.update("""
                UPDATE system_alert SET severity = 'CRITICAL', trigger_value = ?, threshold = ?, latest_value = ?,
                    held_at = ?
                WHERE id = ? AND severity = 'WARNING' AND resolved_at IS NULL""", value, threshold, value, at(now),
                alert.id());
        if (changed == 1) {
            report(NotificationKind.SYSTEM_ALERT_ESCALATED, AuditAction.SYSTEM_ALERT_ESCALATED, alert.id(),
                    alert.signal(), SystemAlertSeverity.CRITICAL, value, threshold);
        }
    }

    /**
     * The condition still stands, or nothing says it passed ({@code value} null): the clear period
     * starts again. An instance that sees it stand keeps an instance that does not from resolving.
     */
    void hold(OpenSystemAlert alert, @Nullable Double value, Instant now) {
        jdbc.update("""
                UPDATE system_alert SET latest_value = COALESCE(CAST(? AS double precision), latest_value), held_at = ?
                WHERE id = ? AND resolved_at IS NULL""", value, at(now), alert.id());
    }

    /** Below the clear threshold, not for long enough yet. */
    void observe(OpenSystemAlert alert, double value) {
        jdbc.update("UPDATE system_alert SET latest_value = ? WHERE id = ? AND resolved_at IS NULL", value, alert.id());
    }

    /** Resolves the alert unless another instance saw the condition since {@code calmSince}. */
    @Transactional
    void resolve(OpenSystemAlert alert, double value, double threshold, Instant calmSince, Instant now) {
        int changed = jdbc.update("""
                UPDATE system_alert SET resolved_at = ?, latest_value = ?
                WHERE id = ? AND resolved_at IS NULL AND held_at <= ?""", at(now), value, alert.id(), at(calmSince));
        if (changed == 1) {
            report(NotificationKind.SYSTEM_ALERT_RESOLVED, AuditAction.SYSTEM_ALERT_RESOLVED, alert.id(),
                    alert.signal(), alert.severity(), value, threshold);
        }
    }

    /** One batch, in its own transaction; instances pruning at once skip each other's rows. */
    int prune(OffsetDateTime cutoff, int batchSize) {
        return jdbc.update("""
                DELETE FROM system_alert WHERE id IN (
                    SELECT id FROM system_alert WHERE resolved_at < ? LIMIT ? FOR UPDATE SKIP LOCKED)""", cutoff,
                batchSize);
    }

    private void report(NotificationKind kind, AuditAction action, long id, SystemAlertSignal signal,
            SystemAlertSeverity severity, double value, double threshold) {
        auditLog.record(AuditActor.SYSTEM, null, action, id, AuditDetails.of("signal", signal.name(), "severity",
                severity.name(), "value", value, "threshold", threshold));
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("label", signal.label());
        payload.put("unit", signal.unit());
        payload.put("severity", severity.name());
        payload.put("value", value);
        payload.put("threshold", threshold);
        users.findEnabledIdsBySystemRole(SystemRole.SUPERADMIN)
                .forEach(user -> notifications.notify(user, null, kind, Long.toString(id), payload));
    }

    private static OffsetDateTime at(Instant instant) {
        return OffsetDateTime.ofInstant(instant, ZoneOffset.UTC);
    }
}
