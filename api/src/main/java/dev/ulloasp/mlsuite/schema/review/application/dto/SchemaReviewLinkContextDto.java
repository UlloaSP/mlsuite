package dev.ulloasp.mlsuite.schema.review.application.dto;

import java.util.List;

import dev.ulloasp.mlsuite.schema.application.dto.SchemaDto;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaVersionDto;

public record SchemaReviewLinkContextDto(
        SchemaReviewOrganizationDto organization,
        SchemaDto schema,
        SchemaVersionDto schemaVersion,
        List<SchemaReviewRunListItemDto> runs) {
}
