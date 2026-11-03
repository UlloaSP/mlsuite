package dev.ulloasp.mlsuite.admin.alert;

import java.time.OffsetDateTime;
import java.util.List;

import jakarta.annotation.Nullable;

/**
 * Open alerts, those resolved most recently, and the signals as the answering instance last read
 * them; {@code sampledAt} and {@code opsAgentReporting} are null before its first look.
 */
public record SystemAlertsDto(
        @Nullable OffsetDateTime sampledAt,
        @Nullable Boolean opsAgentReporting,
        List<SystemAlertSignalDto> signals,
        List<SystemAlertDto> open,
        List<SystemAlertDto> recent) {
}
