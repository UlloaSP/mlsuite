package dev.ulloasp.mlsuite.schema.application.dto;

import java.util.List;

/**
 * Every inference of the organization with what its table needs: the runs, their results and
 * feedback, and the schema versions they ran against. Lists are flat and joined by id.
 */
public record InferenceTableDto(
        List<InferenceTableRunDto> runs,
        List<PredictionResultDto> results,
        List<PredictionResultFeedbackDto> feedback,
        List<SchemaVersionDto> versions) {
}
