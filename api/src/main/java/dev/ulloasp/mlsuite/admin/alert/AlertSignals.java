package dev.ulloasp.mlsuite.admin.alert;

import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.JsonNode;

import dev.ulloasp.mlsuite.admin.infrastructure.OpsAgentClient;
import dev.ulloasp.mlsuite.admin.infrastructure.OpsAgentException;
import dev.ulloasp.mlsuite.schema.application.service.RuntimeSlots;
import jakarta.annotation.Nullable;
import lombok.RequiredArgsConstructor;

/**
 * Reads every signal. A signal it cannot read has no value rather than a zero: while the ops agent
 * is not reporting, the host measures are unknown, which is neither a breach nor a recovery. The
 * database signals read the same on every API instance; the runtime's are this instance's own.
 */
@Component
@RequiredArgsConstructor
public class AlertSignals {

    private final JdbcTemplate jdbc;
    private final OpsAgentClient opsAgent;
    private final List<RuntimeSlots> runtimeShares;

    private long rejectedBefore;
    private Instant readBefore;
    private volatile Sample latest;

    /** What one look found; a signal missing from {@code values} could not be read. */
    public record Sample(Instant at, Map<SystemAlertSignal, Double> values) {

        boolean opsAgentReporting() {
            return values.get(SystemAlertSignal.OPS_AGENT) == 0;
        }
    }

    Sample read(Instant now) {
        Map<SystemAlertSignal, Double> values = new EnumMap<>(SystemAlertSignal.class);
        readBacklogs(values, now);
        readRuntime(values, now);
        readHost(values);
        latest = new Sample(now, values);
        return latest;
    }

    /** The last look this instance took, null before its first. */
    @Nullable
    Sample latest() {
        return latest;
    }

    private void readBacklogs(Map<SystemAlertSignal, Double> values, Instant now) {
        jdbc.query("""
                SELECT COALESCE(sum(total_rows - done_rows - failed_rows), 0),
                    COALESCE(EXTRACT(EPOCH FROM (? - min(created_at))), 0)
                FROM prediction_job WHERE status IN ('QUEUED', 'RUNNING')""", row -> {
            values.put(SystemAlertSignal.PREDICTION_ROWS_PENDING, row.getDouble(1));
            values.put(SystemAlertSignal.PREDICTION_OLDEST_AGE, (double) Math.round(row.getDouble(2)));
        }, OffsetDateTime.ofInstant(now, ZoneOffset.UTC));
        values.put(SystemAlertSignal.MODELS_PREPARING, count("model WHERE runtime_state = 'PREPARING'"));
        values.put(SystemAlertSignal.STORAGE_DELETIONS_FAILED, count("storage_deletion_task WHERE status = 'FAILED'"));
    }

    private double count(String from) {
        return jdbc.queryForObject("SELECT count(*) FROM " + from, Double.class);
    }

    private void readRuntime(Map<SystemAlertSignal, Double> values, Instant now) {
        long waiting = 0;
        long rejected = 0;
        for (RuntimeSlots share : runtimeShares) {
            RuntimeSlots.Load load = share.load();
            waiting += load.waiting();
            rejected += load.rejected();
        }
        values.put(SystemAlertSignal.RUNTIME_QUEUE, (double) waiting);
        values.put(SystemAlertSignal.RUNTIME_REJECTIONS, rejectionsPerMinute(rejected, now));
        rejectedBefore = rejected;
        readBefore = now;
    }

    private double rejectionsPerMinute(long rejected, Instant now) {
        if (readBefore == null) return 0;
        double seconds = Duration.between(readBefore, now).toMillis() / 1000d;
        if (seconds <= 0) return 0;
        return Math.round((rejected - rejectedBefore) * 600 / seconds) / 10d;
    }

    private void readHost(Map<SystemAlertSignal, Double> values) {
        try {
            JsonNode load = opsAgent.load();
            readPercent(values, SystemAlertSignal.HOST_CPU, load.path("cpuPercent"));
            readPercent(values, SystemAlertSignal.HOST_RAM, load.path("ramPercent"));
            readPercent(values, SystemAlertSignal.HOST_DISK, load.path("diskPercent"));
            values.put(SystemAlertSignal.OPS_AGENT, 0d);
        } catch (OpsAgentException notReporting) {
            values.put(SystemAlertSignal.OPS_AGENT, 1d);
        }
    }

    private static void readPercent(Map<SystemAlertSignal, Double> values, SystemAlertSignal signal, JsonNode percent) {
        if (percent.isNumber()) values.put(signal, percent.doubleValue());
    }
}
