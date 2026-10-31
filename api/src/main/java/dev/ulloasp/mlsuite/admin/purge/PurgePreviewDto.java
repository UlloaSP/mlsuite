package dev.ulloasp.mlsuite.admin.purge;

import java.util.Map;

import jakarta.annotation.Nullable;

/**
 * What a purge would destroy right now. {@code confirmation} is the name to type back; a
 * {@code refusal} says why it cannot be asked for.
 */
public record PurgePreviewDto(
        PurgeScope scope,
        Long targetId,
        String targetLabel,
        String confirmation,
        Map<String, Long> counts,
        @Nullable String refusal) {
}
