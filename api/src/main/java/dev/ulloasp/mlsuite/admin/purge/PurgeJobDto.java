package dev.ulloasp.mlsuite.admin.purge;

import java.time.OffsetDateTime;
import java.util.Map;

import jakarta.annotation.Nullable;

/** A purge as superadmins follow it: {@code counts} is what each kind of row lost so far. */
public record PurgeJobDto(
        Long id,
        PurgeScope scope,
        Long targetId,
        String targetLabel,
        String requestedByLabel,
        PurgeStatus status,
        PurgePhase phase,
        int phaseNumber,
        int phaseCount,
        Map<String, Long> counts,
        @Nullable String error,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        @Nullable OffsetDateTime finishedAt) {
}
