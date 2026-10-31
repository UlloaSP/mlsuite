package dev.ulloasp.mlsuite.admin.alert;

import jakarta.annotation.Nullable;

/** {@code value} is null when the signal could not be read. */
public record SystemAlertSignalDto(
        SystemAlertSignal signal,
        String label,
        String unit,
        @Nullable Double value,
        double warningThreshold,
        @Nullable Double criticalThreshold,
        double clearThreshold) {
}
