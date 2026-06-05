package dev.ulloasp.mlsuite.schema.review.application.dto;

import java.util.List;

import jakarta.validation.constraints.NotEmpty;

public record SubmitSchemaReviewRunsRequest(@NotEmpty List<String> runTokens) {
}
