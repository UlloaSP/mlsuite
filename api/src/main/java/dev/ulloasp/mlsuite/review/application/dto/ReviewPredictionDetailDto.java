package dev.ulloasp.mlsuite.review.application.dto;

import java.util.List;

import dev.ulloasp.mlsuite.prediction.application.dto.ExplanationFeedbackDto;
import dev.ulloasp.mlsuite.prediction.application.dto.OutputFeedbackDto;
import dev.ulloasp.mlsuite.prediction.application.dto.PredictionDto;
import dev.ulloasp.mlsuite.prediction.application.dto.TargetDto;

public record ReviewPredictionDetailDto(
        PredictionDto prediction,
        List<TargetDto> targets,
        List<OutputFeedbackDto> outputFeedback,
        List<ExplanationFeedbackDto> explanationFeedback) {
}
