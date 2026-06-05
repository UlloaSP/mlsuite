package dev.ulloasp.mlsuite.schema.review.application.dto;

import java.util.List;

import dev.ulloasp.mlsuite.schema.application.dto.PredictionResultFeedbackDto;
import dev.ulloasp.mlsuite.schema.application.dto.PredictionRunDto;

public record SchemaReviewRunDetailDto(
        PredictionRunDto run,
        List<PredictionResultFeedbackDto> feedback) {
}
