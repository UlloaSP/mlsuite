package dev.ulloasp.mlsuite.schema.application.dto;

import java.util.List;
import java.util.Map;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

public record CreatePredictionRunRequest(
        @NotBlank String name,
        @NotEmpty Map<String, Object> inputData,
        @NotEmpty List<@Valid CreatePredictionResultRequest> results) {
}
