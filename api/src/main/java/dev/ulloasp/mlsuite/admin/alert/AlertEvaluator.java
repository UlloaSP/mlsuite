package dev.ulloasp.mlsuite.admin.alert;

import java.time.Instant;
import java.util.EnumMap;
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import dev.ulloasp.mlsuite.admin.alert.AlertSettings.Threshold;
import jakarta.annotation.Nullable;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;

/**
 * Compares the signals with their thresholds. An alert raises, or escalates, once its condition
 * has held for the sustain period, and resolves once the value has stayed under the clear threshold
 * for the clear period. The time a condition began is this instance's own, so a restart starts it
 * again; the time it last held is on the alert, shared by every instance (see the ledger).
 *
 * <p>It has a thread of its own rather than {@code @Scheduled}, so a scheduler short of threads
 * under the very load this has to report cannot delay it.
 */
@Component
@RequiredArgsConstructor
public class AlertEvaluator {

    private static final Logger log = LoggerFactory.getLogger(AlertEvaluator.class);

    private final AlertSignals signals;
    private final SystemAlertLedger ledger;
    private final AlertSettings settings;

    private final Map<SystemAlertSignal, Instant> warningSince = new EnumMap<>(SystemAlertSignal.class);
    private final Map<SystemAlertSignal, Instant> criticalSince = new EnumMap<>(SystemAlertSignal.class);
    private final ScheduledExecutorService schedule = Executors.newSingleThreadScheduledExecutor(
            Thread.ofPlatform().daemon().name("system-alerts").factory());

    @EventListener(ApplicationReadyEvent.class)
    void start() {
        long every = settings.evaluateSeconds();
        schedule.scheduleWithFixedDelay(this::evaluateNow, every, every, TimeUnit.SECONDS);
    }

    @PreDestroy
    void stop() {
        schedule.shutdownNow();
    }

    /** A failed look is logged and the next one still comes: an exception here would end the schedule. */
    private void evaluateNow() {
        try {
            evaluate(Instant.now());
        } catch (RuntimeException failure) {
            log.error("Could not evaluate system alerts", failure);
        }
    }

    void evaluate(Instant now) {
        Map<SystemAlertSignal, Double> values = signals.read(now).values();
        Map<SystemAlertSignal, OpenSystemAlert> open = ledger.open();
        for (SystemAlertSignal signal : SystemAlertSignal.values()) {
            Double value = values.get(signal);
            SystemAlertSeverity sustained = sustained(signal, value, now);
            OpenSystemAlert alert = open.get(signal);
            if (alert != null) {
                advance(alert, value, sustained, now);
            } else if (sustained != null) {
                Threshold threshold = settings.threshold(signal);
                ledger.raise(signal, sustained, value, sustained == SystemAlertSeverity.CRITICAL
                        ? threshold.critical() : threshold.warning(), now);
            }
        }
    }

    /** The severity whose condition has held long enough; an unknown value holds none. */
    @Nullable
    private SystemAlertSeverity sustained(SystemAlertSignal signal, @Nullable Double value, Instant now) {
        Threshold threshold = settings.threshold(signal);
        boolean warning = value != null && value >= threshold.warning();
        boolean critical = value != null && threshold.critical() != null && value >= threshold.critical();
        boolean warningHeld = held(warningSince, signal, warning, now);
        if (held(criticalSince, signal, critical, now)) return SystemAlertSeverity.CRITICAL;
        return warningHeld ? SystemAlertSeverity.WARNING : null;
    }

    private boolean held(Map<SystemAlertSignal, Instant> since, SystemAlertSignal signal, boolean condition,
            Instant now) {
        if (!condition) {
            since.remove(signal);
            return false;
        }
        return !since.computeIfAbsent(signal, key -> now).plusSeconds(settings.sustainSeconds()).isAfter(now);
    }

    private void advance(OpenSystemAlert alert, @Nullable Double value, @Nullable SystemAlertSeverity sustained,
            Instant now) {
        Threshold threshold = settings.threshold(alert.signal());
        Instant calmSince = now.minusSeconds(settings.clearSeconds());
        if (sustained == SystemAlertSeverity.CRITICAL && alert.severity() == SystemAlertSeverity.WARNING) {
            ledger.escalate(alert, value, threshold.critical(), now);
        } else if (value == null || value >= threshold.clear()) {
            ledger.hold(alert, value, now);
        } else if (alert.heldAt().isAfter(calmSince)) {
            ledger.observe(alert, value);
        } else {
            ledger.resolve(alert, value, threshold.clear(), calmSince, now);
        }
    }
}
