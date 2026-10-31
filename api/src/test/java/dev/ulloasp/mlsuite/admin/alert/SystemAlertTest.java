package dev.ulloasp.mlsuite.admin.alert;

import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicReference;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import dev.ulloasp.mlsuite.admin.infrastructure.OpsAgentClient;
import dev.ulloasp.mlsuite.admin.infrastructure.OpsAgentException;
import dev.ulloasp.mlsuite.schema.PublicPredictionFixture;
import dev.ulloasp.mlsuite.schema.application.service.RuntimeQueue;
import dev.ulloasp.mlsuite.schema.application.service.RuntimeSlots;
import dev.ulloasp.mlsuite.user.domain.model.SystemRole;
import dev.ulloasp.mlsuite.user.domain.model.User;

/**
 * The platform's alerts on real PostgreSQL: raised once a condition holds, resolved once it has
 * stayed gone, one alert and one report however many instances evaluate, and what the ops agent
 * cannot measure counted neither as a breach nor as a recovery.
 */
@TestPropertySource(properties = { "mlsuite.alerts.sustain-seconds=60", "mlsuite.alerts.clear-seconds=120",
        "mlsuite.alerts.retention-days=30", "mlsuite.alerts.retention-batch-size=2",
        "mlsuite.alerts.thresholds.host-cpu.warning=80", "mlsuite.alerts.thresholds.host-cpu.critical=90",
        "mlsuite.alerts.thresholds.host-cpu.clear=70" })
class SystemAlertTest extends PublicPredictionFixture {

    private static final Instant T = Instant.parse("2026-10-31T12:00:00Z");

    @MockitoBean OpsAgentClient opsAgent;
    @Autowired AlertSignals signals;
    @Autowired SystemAlertLedger ledger;
    @Autowired AlertSettings settings;
    @Autowired SystemAlertRetention retention;
    @Autowired JdbcTemplate jdbc;
    private AlertEvaluator evaluator;
    private User superadmin;
    private User disabled;
    private User member;

    @BeforeEach
    void aPlatformWithNoAlerts() {
        jdbc.update("DELETE FROM system_alert");
        jdbc.update("DELETE FROM audit_event WHERE action LIKE 'SYSTEM_ALERT%'");
        evaluator = new AlertEvaluator(signals, ledger, settings);
        superadmin = user(SystemRole.SUPERADMIN);
        disabled = user(SystemRole.SUPERADMIN);
        member = user(SystemRole.USER);
        jdbc.update("UPDATE app_user SET enabled = FALSE WHERE id = ?", disabled.getId());
    }

    @Test
    void anAlertRaisesOnlyOnceTheConditionHasHeldForTheSustainPeriod() {
        cpuAt(85);
        evaluateAt(0);
        evaluateAt(59);
        assertEquals(0, alerts());

        evaluateAt(60);
        evaluateAt(75);

        assertEquals(1, alerts());
        assertEquals(Map.of("signal", "HOST_CPU", "severity", "WARNING", "trigger_value", 85d, "threshold", 80d),
                jdbc.queryForMap("SELECT signal, severity, trigger_value, threshold FROM system_alert"));
        assertEquals(1, notifications(superadmin, "SYSTEM_ALERT_RAISED"));
        assertEquals(0, notifications(disabled, "SYSTEM_ALERT_RAISED"));
        assertEquals(0, notifications(member, "SYSTEM_ALERT_RAISED"));
        assertEquals(1, jdbc.queryForObject("""
                SELECT count(*) FROM audit_event WHERE action = 'SYSTEM_ALERT_RAISED' AND actor_kind = 'SYSTEM'
                AND organization_id IS NULL""", Integer.class));
    }

    @Test
    void aConditionThatLapsesStartsItsSustainPeriodAgain() {
        cpuAt(85);
        evaluateAt(0);
        cpuAt(79);
        evaluateAt(30);
        cpuAt(85);
        evaluateAt(45);
        evaluateAt(90);
        assertEquals(0, alerts());

        evaluateAt(105);
        assertEquals(1, alerts());
    }

    @Test
    void anAlertStaysOpenUntilTheValueHasStayedUnderTheClearThreshold() {
        raiseAt(85, 60);
        cpuAt(75);
        evaluateAt(400);
        cpuAt(65);
        evaluateAt(450);
        evaluateAt(519);
        cpuAt(72);
        evaluateAt(520);
        cpuAt(65);
        evaluateAt(639);
        assertEquals(1, openAlerts());

        evaluateAt(640);

        assertEquals(0, openAlerts());
        assertEquals(65d, jdbc.queryForObject("SELECT latest_value FROM system_alert", Double.class));
        assertEquals(1, notifications(superadmin, "SYSTEM_ALERT_RESOLVED"));
        assertEquals(1, audited("SYSTEM_ALERT_RESOLVED"));

        evaluateAt(700);
        assertEquals(1, notifications(superadmin, "SYSTEM_ALERT_RESOLVED"));
    }

    @Test
    void anInstanceSeeingTheConditionKeepsACalmOneFromResolving() {
        raiseAt(85, 60);
        cpuAt(60);
        OpenSystemAlert alert = ledger.open().get(SystemAlertSignal.HOST_CPU);
        ledger.hold(alert, 85d, T.plusSeconds(170));

        evaluateAt(180);
        assertEquals(1, openAlerts());
        evaluateAt(290);
        assertEquals(0, openAlerts());
    }

    @Test
    void aWarningEscalatesInPlaceAndStaysCriticalUntilItResolves() {
        raiseAt(85, 60);
        cpuAt(95);
        evaluateAt(70);
        evaluateAt(129);
        assertEquals("WARNING", jdbc.queryForObject("SELECT severity FROM system_alert", String.class));

        evaluateAt(130);
        evaluateAt(140);
        cpuAt(85);
        evaluateAt(150);

        assertEquals(1, alerts());
        assertEquals(Map.of("severity", "CRITICAL", "trigger_value", 95d, "threshold", 90d, "latest_value", 85d),
                jdbc.queryForMap("SELECT severity, trigger_value, threshold, latest_value FROM system_alert"));
        assertEquals(1, notifications(superadmin, "SYSTEM_ALERT_ESCALATED"));
        assertEquals(1, audited("SYSTEM_ALERT_ESCALATED"));
    }

    @Test
    void aConditionPastCriticalRaisesCriticalOnce() {
        raiseAt(95, 60);

        assertEquals("CRITICAL", jdbc.queryForObject("SELECT severity FROM system_alert", String.class));
        assertEquals(1, notifications(superadmin, "SYSTEM_ALERT_RAISED"));
        assertEquals(0, notifications(superadmin, "SYSTEM_ALERT_ESCALATED"));
    }

    @Test
    void instancesEvaluatingTogetherRaiseOneAlertAndReportItOnce() throws Exception {
        cpuAt(85);
        for (int round = 1; round <= 5; round++) {
            jdbc.update("DELETE FROM system_alert");
            jdbc.update("DELETE FROM audit_event WHERE action = 'SYSTEM_ALERT_RAISED'");
            jdbc.update("DELETE FROM notification WHERE recipient_user_id = ?", superadmin.getId());
            List<AlertEvaluator> instances = List.of(instance(), instance(), instance(), instance());
            instances.forEach(instance -> instance.evaluate(T));
            CountDownLatch start = new CountDownLatch(1);
            List<CompletableFuture<Void>> evaluations = instances.stream()
                    .map(instance -> CompletableFuture.runAsync(() -> {
                        await(start);
                        instance.evaluate(T.plusSeconds(60));
                    })).toList();
            start.countDown();
            CompletableFuture.allOf(evaluations.toArray(CompletableFuture[]::new)).get();

            assertEquals(1, alerts());
            assertEquals(1, audited("SYSTEM_ALERT_RAISED"));
            assertEquals(1, notifications(superadmin, "SYSTEM_ALERT_RAISED"));
        }
    }

    @Test
    void aSilentOpsAgentIsItsOwnAlertAndNeitherABreachNorARecovery() {
        raiseAt(85, 60);
        when(opsAgent.load()).thenThrow(new OpsAgentException(502, "Ops agent unavailable."));
        evaluateAt(70);
        evaluateAt(130);
        assertEquals(List.of("HOST_CPU", "OPS_AGENT"), jdbc.queryForList(
                "SELECT signal FROM system_alert WHERE resolved_at IS NULL ORDER BY signal", String.class));

        evaluateAt(400);
        assertEquals(85d, jdbc.queryForObject(
                "SELECT latest_value FROM system_alert WHERE signal = 'HOST_CPU'", Double.class));

        reset(opsAgent);
        cpuAt(60);
        evaluateAt(410);
        assertEquals(2, openAlerts());
        evaluateAt(519);
        assertEquals(2, openAlerts());
        evaluateAt(520);
        assertEquals(0, openAlerts());
    }

    @Test
    void evaluationHasItsOwnThreadAndOutlivesAFailedLook() {
        AlertSettings everySecond = new AlertSettings(1, 60, 120, 30, 10, settings.thresholds());
        AlertSignals failing = mock(AlertSignals.class);
        AtomicReference<String> thread = new AtomicReference<>();
        when(failing.read(any())).thenAnswer(look -> {
            thread.set(Thread.currentThread().getName());
            throw new IllegalStateException("The database is away");
        });
        AlertEvaluator scheduled = new AlertEvaluator(failing, ledger, everySecond);

        scheduled.start();
        try {
            verify(failing, timeout(5_000).atLeast(2)).read(any());
        } finally {
            scheduled.stop();
        }

        assertEquals("system-alerts", thread.get());
    }

    @Test
    void anAgentThatCannotMeasureOneResourceLeavesOnlyThatOneUnread() throws Exception {
        when(opsAgent.load()).thenReturn(objectMapper.readTree("{\"cpuPercent\":12,\"ramPercent\":null}"));

        var values = signals.read(T).values();

        assertEquals(12d, values.get(SystemAlertSignal.HOST_CPU));
        assertNull(values.get(SystemAlertSignal.HOST_RAM));
        assertNull(values.get(SystemAlertSignal.HOST_DISK));
        assertEquals(0d, values.get(SystemAlertSignal.OPS_AGENT));
    }

    @Test
    void theBacklogsAreReadFromTheirQueues() {
        cpuAt(1);
        var before = signals.read(T).values();
        jdbc.update("""
                INSERT INTO prediction_job (organization_id, schema_bookmark_id, schema_version_id, created_by_user_id,
                    status, total_rows, done_rows, failed_rows, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, 100, 30, 10, ?::timestamptz, now())""", organization.getId(), bookmark.getId(),
                version.getId(), owner.getId(), "RUNNING", T.minusSeconds(600).toString());
        jdbc.update("""
                INSERT INTO prediction_job (organization_id, schema_bookmark_id, schema_version_id, created_by_user_id,
                    status, total_rows, created_at, updated_at)
                VALUES (?, ?, ?, ?, 'CANCELLED', 900, now(), now())""", organization.getId(), bookmark.getId(),
                version.getId(), owner.getId());
        jdbc.update("UPDATE model SET runtime_state = 'PREPARING' WHERE id = ?", forestModel.getId());
        jdbc.update("""
                INSERT INTO storage_deletion_task (bucket, object_key, status) VALUES ('b', ?, 'FAILED'),
                    ('b', ?, 'PENDING')""", UUID.randomUUID().toString(), UUID.randomUUID().toString());

        var after = signals.read(T).values();

        assertEquals(60d, after.get(SystemAlertSignal.PREDICTION_ROWS_PENDING)
                - before.get(SystemAlertSignal.PREDICTION_ROWS_PENDING));
        assertEquals(600d, after.get(SystemAlertSignal.PREDICTION_OLDEST_AGE));
        assertEquals(1d, after.get(SystemAlertSignal.MODELS_PREPARING) - before.get(SystemAlertSignal.MODELS_PREPARING));
        assertEquals(1d, after.get(SystemAlertSignal.STORAGE_DELETIONS_FAILED)
                - before.get(SystemAlertSignal.STORAGE_DELETIONS_FAILED));
        jdbc.update("DELETE FROM prediction_job WHERE organization_id = ?", organization.getId());
        jdbc.update("DELETE FROM storage_deletion_task WHERE bucket = 'b'");
    }

    @Test
    void theRuntimeSignalsAddUpItsSharesAndTurnRejectionsIntoARate() {
        cpuAt(1);
        RuntimeSlots share = new RuntimeSlots(0, new RuntimeQueue(0, 1, 0), retry -> new IllegalStateException()) {
        };
        AlertSignals local = new AlertSignals(jdbc, opsAgent, List.of(share));
        local.read(T);

        assertThrows(IllegalStateException.class, () -> share.admit("ana"));
        assertThrows(IllegalStateException.class, () -> share.admit("ana"));
        var values = local.read(T.plusSeconds(15)).values();

        assertEquals(8d, values.get(SystemAlertSignal.RUNTIME_REJECTIONS));
        assertEquals(0d, values.get(SystemAlertSignal.RUNTIME_QUEUE));
    }

    @Test
    void closedAlertsAreForgottenAfterTheRetentionPeriodAndOpenOnesStay() {
        for (int age = 29; age <= 33; age++) insertAlert("resolved_at", "now() - interval '" + age + " days'");
        insertAlert("resolved_at", "NULL");

        retention.prune();

        assertEquals(2, alerts());
        assertEquals(1, openAlerts());
        assertEquals(1, audited("SYSTEM_ALERT_RETENTION_PRUNE"));
    }

    @Test
    void superadminsReadAlertsAndCurrentValuesAndNobodyElseDoes() throws Exception {
        mockMvc.perform(signedIn(get("/api/admin/alerts"), member.getId())).andExpect(status().isForbidden());
        raiseAt(85, 60);
        when(opsAgent.load()).thenThrow(new OpsAgentException(502, "Ops agent unavailable."));
        evaluateAt(70);

        mockMvc.perform(signedIn(get("/api/admin/alerts"), superadmin.getId(), SystemRole.SUPERADMIN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.opsAgentReporting").value(false))
                .andExpect(jsonPath("$.open[0].signal").value("HOST_CPU"))
                .andExpect(jsonPath("$.open[0].label").value("CPU"))
                .andExpect(jsonPath("$.open[0].unit").value("%"))
                .andExpect(jsonPath("$.open[0].severity").value("WARNING"))
                .andExpect(jsonPath("$.open[0].resolvedAt").doesNotExist())
                .andExpect(jsonPath("$.recent.length()").value(0))
                .andExpect(jsonPath("$.signals[6].signal").value("HOST_CPU"))
                .andExpect(jsonPath("$.signals[6].value").value(nullValue()))
                .andExpect(jsonPath("$.signals[6].warningThreshold").value(80d));
    }

    @Test
    void thresholdsThatCouldFlapAreRefusedAtStartup() {
        Map<SystemAlertSignal, AlertSettings.Threshold> inverted = Map.of(SystemAlertSignal.HOST_CPU,
                new AlertSettings.Threshold(80, 90d, 85));

        assertThrows(IllegalArgumentException.class, () -> new AlertSettings(15, 60, 120, 30, 10, inverted));
    }

    private void cpuAt(double percent) {
        try {
            when(opsAgent.load()).thenReturn(objectMapper.readTree(
                    "{\"cpuPercent\":" + percent + ",\"ramPercent\":1,\"diskPercent\":1}"));
        } catch (java.io.IOException impossible) {
            throw new IllegalStateException(impossible);
        }
    }

    private void evaluateAt(long seconds) {
        evaluator.evaluate(T.plusSeconds(seconds));
    }

    private void raiseAt(double percent, long sustain) {
        cpuAt(percent);
        evaluateAt(0);
        evaluateAt(sustain);
    }

    private AlertEvaluator instance() {
        return new AlertEvaluator(new AlertSignals(jdbc, opsAgent, List.of()), ledger, settings);
    }

    private User user(SystemRole role) {
        User user = new User("u" + System.nanoTime(), UUID.randomUUID() + "@corp.example", "unused", "User", role);
        inTransaction(() -> entityManager.persist(user));
        return user;
    }

    private void insertAlert(String column, String value) {
        jdbc.update("INSERT INTO system_alert (signal, severity, trigger_value, threshold, latest_value, raised_at,"
                + " held_at, " + column + ") VALUES ('HOST_DISK', 'WARNING', 1, 1, 1, now(), now(), " + value + ")");
    }

    private int alerts() {
        return jdbc.queryForObject("SELECT count(*) FROM system_alert", Integer.class);
    }

    private int openAlerts() {
        return jdbc.queryForObject("SELECT count(*) FROM system_alert WHERE resolved_at IS NULL", Integer.class);
    }

    private int notifications(User recipient, String kind) {
        return jdbc.queryForObject("SELECT count(*) FROM notification WHERE recipient_user_id = ? AND kind = ?",
                Integer.class, recipient.getId(), kind);
    }

    private int audited(String action) {
        return jdbc.queryForObject("SELECT count(*) FROM audit_event WHERE action = ?", Integer.class, action);
    }

    private static void await(CountDownLatch latch) {
        try {
            latch.await();
        } catch (InterruptedException interrupted) {
            throw new IllegalStateException(interrupted);
        }
    }
}
