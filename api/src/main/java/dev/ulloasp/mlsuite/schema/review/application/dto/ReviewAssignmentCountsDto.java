package dev.ulloasp.mlsuite.schema.review.application.dto;

/** How many reviewer assignments an inference has, and how many of them are submitted. */
public record ReviewAssignmentCountsDto(long total, long completed) {
}
