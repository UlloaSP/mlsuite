package dev.ulloasp.mlsuite.schema.application.dto;

import java.util.List;
import java.util.Map;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

/** Up to {@value #MAX_ROWS} records one bound model runs in one call, as a bulk upload sends them. */
public record WorkspacePredictionBatchRequest(
        /** The snapshot the form was built from; it must still be the bookmark's target. */
        @NotNull Long schemaVersionId,
        /** One of the snapshot's bound models. */
        @NotNull @Positive Long modelId,
        /** The records the model receives, each under its own feature names. */
        @NotNull @Size(min = 1, max = MAX_ROWS) List<@NotNull Map<String, Object>> rows) {

    public static final int MAX_ROWS = 100;
}
