package dev.ulloasp.mlsuite.schema.review.application.dto;

import dev.ulloasp.mlsuite.schema.application.dto.PredictionResultFeedbackDto;

/** A reviewer's answer as saved, and whether saving it created it or changed an earlier one. */
public record SavedFeedback(PredictionResultFeedbackDto feedback, boolean created) {
}
