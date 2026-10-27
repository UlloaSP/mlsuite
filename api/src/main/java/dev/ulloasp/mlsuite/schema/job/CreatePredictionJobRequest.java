package dev.ulloasp.mlsuite.schema.job;

import java.util.List;
import java.util.Map;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * A bulk upload, sent once: for each row, the run's name and stored inputs, and the record each
 * bound model receives (the form's own mapping, as a single run sends it). The server performs
 * every prediction.
 */
public record CreatePredictionJobRequest(
        @NotNull Long schemaVersionId,
        @NotEmpty List<@Valid PredictionJobRow> rows) {

    public record PredictionJobRow(
            @NotBlank @Size(max = 255) String name,
            @NotEmpty Map<String, Object> inputData,
            @NotEmpty List<@Valid PredictionJobModelInput> models) {
    }

    public record PredictionJobModelInput(@NotNull Long modelId, @NotNull Map<String, Object> modelInput) {
    }
}
