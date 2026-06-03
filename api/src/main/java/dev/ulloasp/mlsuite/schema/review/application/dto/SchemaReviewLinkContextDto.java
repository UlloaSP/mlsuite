package dev.ulloasp.mlsuite.schema.review.application.dto;

import java.util.List;

import dev.ulloasp.mlsuite.review.application.dto.ReviewOrganizationDto;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaDto;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaVersionDto;

public record SchemaReviewLinkContextDto(
        ReviewOrganizationDto organization,
        SchemaDto schema,
        SchemaVersionDto schemaVersion,
        List<SchemaReviewRunListItemDto> runs) {
}
