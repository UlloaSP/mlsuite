package dev.ulloasp.mlsuite.schema.application.dto;

import java.util.List;

/** Each record's result, in the order sent, sealed on its own exactly as a single run's. */
public record WorkspacePredictionBatchDto(List<WorkspacePredictionDto> results) {
}
