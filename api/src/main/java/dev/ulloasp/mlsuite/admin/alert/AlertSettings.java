package dev.ulloasp.mlsuite.admin.alert;

import java.util.EnumMap;
import java.util.Map;

import org.springframework.boot.context.properties.ConfigurationProperties;

import jakarta.annotation.Nullable;

/**
 * How long a condition must hold, and at what values. A signal raises at {@code warning} or
 * {@code critical} and clears under {@code clear}, which sits lower so a value hovering around a
 * raise threshold cannot flap.
 */
@ConfigurationProperties(prefix = "mlsuite.alerts")
public record AlertSettings(long evaluateSeconds, long sustainSeconds, long clearSeconds, int retentionDays,
        int retentionBatchSize, Map<SystemAlertSignal, Threshold> thresholds) {

    /** The ops agent is reporting or it is not, and losing it costs measures, not capacity. */
    private static final Threshold NOT_REPORTING = new Threshold(1, null, 1);

    public record Threshold(double warning, @Nullable Double critical, double clear) {
    }

    public AlertSettings {
        if (evaluateSeconds < 1 || sustainSeconds < 0 || clearSeconds < 0) {
            throw new IllegalArgumentException("ALERTS_EVALUATE_SECONDS must be at least 1, and "
                    + "ALERTS_SUSTAIN_SECONDS and ALERTS_CLEAR_SECONDS cannot be negative.");
        }
        if (retentionDays < 1 || retentionBatchSize < 1) {
            throw new IllegalArgumentException("ALERTS_RETENTION_DAYS and the batch size must be at least 1.");
        }
        Map<SystemAlertSignal, Threshold> all = new EnumMap<>(SystemAlertSignal.class);
        all.putAll(thresholds);
        all.put(SystemAlertSignal.OPS_AGENT, NOT_REPORTING);
        for (SystemAlertSignal signal : SystemAlertSignal.values()) {
            Threshold threshold = all.get(signal);
            if (threshold == null || threshold.clear() > threshold.warning()
                    || (threshold.critical() != null && threshold.critical() < threshold.warning())) {
                throw new IllegalArgumentException("The thresholds of " + signal
                        + " must have clear <= warning <= critical.");
            }
        }
        thresholds = Map.copyOf(all);
    }

    public Threshold threshold(SystemAlertSignal signal) {
        return thresholds.get(signal);
    }
}
