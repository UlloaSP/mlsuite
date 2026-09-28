package dev.ulloasp.mlsuite.schema.application.dto;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * A bookmark as the Predict launcher shows it: what it runs (schema, snapshot,
 * models, inputs, reports) and how it has been used. {@code latestVersion} is the
 * schema's newest snapshot, so a bookmark left behind can say so.
 */
public record PredictBookmarkDto(
        Long id,
        String name,
        Long schemaId,
        String schemaName,
        String schemaDescription,
        Long versionId,
        int version,
        String versionName,
        int latestVersion,
        List<String> models,
        int fieldCount,
        int reportCount,
        long runCount,
        OffsetDateTime lastRunAt,
        OffsetDateTime updatedAt) {
}
