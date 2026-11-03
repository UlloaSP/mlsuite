package dev.ulloasp.mlsuite.apiaccess.application.dto;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonInclude;

import jakarta.annotation.Nullable;

/**
 * What a client gets back from a run: the id its call is logged under, what ran (the bookmark,
 * the snapshot it pointed at, and the model with its artifact's SHA-256 when recorded) and the
 * model's outputs, in output order.
 */
public record ApiPredictionDto(
        UUID requestId,
        ApiPredictionBookmark bookmark,
        ApiPredictionSnapshot snapshot,
        ApiPredictionModel model,
        List<ApiPredictionOutput> outputs) {

    public record ApiPredictionBookmark(String id, String name) {
    }

    public record ApiPredictionSnapshot(int version, @Nullable String name) {
    }

    public record ApiPredictionModel(String name, String sha256) {
    }

    /**
     * A classifier's output is its class and each class's probability, by the labels the model's
     * bundle gives its classes, in class order; a regressor's is its value.
     */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record ApiPredictionOutput(
            @Nullable String prediction,
            @Nullable Map<String, Double> probabilities,
            @Nullable Double value) {

        public static ApiPredictionOutput classifier(String prediction, Map<String, Double> probabilities) {
            return new ApiPredictionOutput(prediction, probabilities, null);
        }

        public static ApiPredictionOutput regressor(Double value) {
            return new ApiPredictionOutput(null, null, value);
        }
    }
}
