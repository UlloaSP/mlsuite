package dev.ulloasp.mlsuite.admin.alert;

import java.time.OffsetDateTime;

import jakarta.annotation.Nullable;

/** {@code value} and {@code threshold} are what put the alert at its current severity. */
public record SystemAlertDto(
        Long id,
        SystemAlertSignal signal,
        String label,
        String unit,
        SystemAlertSeverity severity,
        double value,
        double threshold,
        double latestValue,
        OffsetDateTime raisedAt,
        @Nullable OffsetDateTime resolvedAt) {
}
