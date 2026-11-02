package dev.ulloasp.mlsuite.admin.alert;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import com.fasterxml.jackson.databind.node.ObjectNode;

import dev.ulloasp.mlsuite.admin.infrastructure.OpsAgentClient;
import dev.ulloasp.mlsuite.admin.infrastructure.OpsAgentException;
import dev.ulloasp.mlsuite.schema.PublicPredictionFixture;

/**
 * The host's last local backup, as the ops agent reads it, is an alert of its own: a failed
 * attempt or a backup that is gone raises it, a later successful backup resolves it, and a host
 * that never took one, or an agent that cannot tell, raises nothing.
 */
@TestPropertySource(properties = { "mlsuite.alerts.sustain-seconds=60", "mlsuite.alerts.clear-seconds=120" })
class BackupAlertTest extends PublicPredictionFixture {

    private static final Instant T = Instant.parse("2026-11-02T12:00:00Z");

    @MockitoBean OpsAgentClient opsAgent;
    @Autowired AlertSignals signals;
    @Autowired SystemAlertLedger ledger;
    @Autowired AlertSettings settings;
    @Autowired JdbcTemplate jdbc;
    private AlertEvaluator evaluator;

    @BeforeEach
    void aReportingAgentOnAnIdleHost() {
        jdbc.update("DELETE FROM system_alert");
        evaluator = new AlertEvaluator(signals, ledger, settings);
        when(opsAgent.load()).thenReturn(objectMapper.createObjectNode()
                .put("cpuPercent", 1).put("ramPercent", 1).put("diskPercent", 1));
    }

    @Test
    void aFailedBackupRaisesACriticalAlertThatTheNextBackupResolves() {
        backupFailing(true);
        evaluateAt(0);
        evaluateAt(60);

        assertEquals(List.of(Map.of("signal", "BACKUP_FAILED", "severity", "CRITICAL")), jdbc.queryForList(
                "SELECT signal, severity FROM system_alert WHERE resolved_at IS NULL"));

        // It last held at 60 s; it resolves once it has stayed clear for the clear period.
        backupFailing(false);
        evaluateAt(70);
        evaluateAt(179);
        assertEquals(1, openAlerts());
        evaluateAt(180);
        assertEquals(0, openAlerts());
    }

    @Test
    void aHostThatNeverTookABackupHasNothingFailing() {
        backupFailing(false);
        evaluateAt(0);
        evaluateAt(3600);

        assertEquals(0d, signals.latest().values().get(SystemAlertSignal.BACKUP_FAILED));
        assertEquals(0, openAlerts());
    }

    @Test
    void anAgentThatCannotTellLeavesTheBackupUnknown() {
        ObjectNode unknown = objectMapper.createObjectNode().putNull("failing");
        when(opsAgent.backup()).thenReturn(unknown);
        assertNull(signals.read(T).values().get(SystemAlertSignal.BACKUP_FAILED));

        when(opsAgent.backup()).thenThrow(new OpsAgentException(502, "Ops agent unavailable."));
        assertNull(signals.read(T).values().get(SystemAlertSignal.BACKUP_FAILED));
        evaluateAt(0);
        evaluateAt(60);
        assertEquals(0, openAlerts());
    }

    private void backupFailing(boolean failing) {
        when(opsAgent.backup()).thenReturn(objectMapper.createObjectNode().put("failing", failing));
    }

    private void evaluateAt(long seconds) {
        evaluator.evaluate(T.plusSeconds(seconds));
    }

    private int openAlerts() {
        return jdbc.queryForObject("SELECT count(*) FROM system_alert WHERE resolved_at IS NULL", Integer.class);
    }
}
