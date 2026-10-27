package dev.ulloasp.mlsuite.schema.application.dto;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Up to {@value #MAX_RUNS} runs of one bookmark saved together, in order, all or none. */
public record CreatePredictionRunsRequest(
        @NotNull @Size(min = 1, max = MAX_RUNS) List<@NotNull @Valid CreatePredictionRunRequest> runs) {

    public static final int MAX_RUNS = 100;
}
