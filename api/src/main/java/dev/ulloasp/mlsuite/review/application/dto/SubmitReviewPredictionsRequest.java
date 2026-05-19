package dev.ulloasp.mlsuite.review.application.dto;

import java.util.List;

import jakarta.validation.constraints.NotEmpty;

public record SubmitReviewPredictionsRequest(
        @NotEmpty List<String> predictionTokens) {
}
