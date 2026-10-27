package dev.ulloasp.mlsuite.schema.application.dto;

import java.util.List;

/** The ids of the runs saved together, in the order they were sent. */
public record CreatedPredictionRunsDto(List<Long> runIds) {
}
