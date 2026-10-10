package dev.ulloasp.mlsuite.schema.review.application.dto;

import dev.ulloasp.mlsuite.schema.application.dto.SchemaDto;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaVersionDto;

/** One review of the inbox without its runs: what it reviews and how far the reviewer is. */
public record ReviewCatalogSummaryDto(
        String publicId,
        SchemaDto schema,
        SchemaVersionDto schemaVersion,
        long totalRuns,
        long inProgressRuns,
        long submittedRuns) {
}
