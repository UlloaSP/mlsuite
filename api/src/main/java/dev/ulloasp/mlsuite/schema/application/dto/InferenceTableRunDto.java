package dev.ulloasp.mlsuite.schema.application.dto;

import java.util.Map;

import dev.ulloasp.mlsuite.schema.domain.model.PredictionRun;

/** One inference in the table: its catalog summary and the form inputs it ran with. */
public record InferenceTableRunDto(
        PredictionRunCatalogItemDto summary,
        Map<String, Object> inputData) {

    public static InferenceTableRunDto from(PredictionRun run) {
        return new InferenceTableRunDto(PredictionRunCatalogItemDto.from(run), run.getInputData());
    }
}
