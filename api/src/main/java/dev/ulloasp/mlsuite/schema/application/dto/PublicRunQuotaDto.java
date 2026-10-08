package dev.ulloasp.mlsuite.schema.application.dto;

import java.time.Instant;

import jakarta.annotation.Nullable;

/**
 * What the caller may still run on one public bookmark: {@code remaining} of {@code limit} runs.
 * {@code resetsAt} is when the count starts again, and is null while no run is counted.
 */
public record PublicRunQuotaDto(int limit, int remaining, @Nullable Instant resetsAt) {
}
