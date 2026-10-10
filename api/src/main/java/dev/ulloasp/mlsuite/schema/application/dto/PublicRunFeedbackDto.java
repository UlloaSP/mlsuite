package dev.ulloasp.mlsuite.schema.application.dto;

import com.fasterxml.jackson.databind.JsonNode;

import dev.ulloasp.mlsuite.schema.domain.model.PredictionResultFeedbackType;

/** The caller's own answer about one report of their public run, under that report's key. */
public record PublicRunFeedbackDto(String reportKey, PredictionResultFeedbackType type, JsonNode value) {
}
