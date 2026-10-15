package dev.ulloasp.mlsuite.schema.application.dto;

import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.annotation.JsonInclude;

import jakarta.annotation.Nullable;

/** What a consumer gets back from a run made with an API key: the model's outputs, in output order. */
public record ConsumerPredictionDto(List<ConsumerOutput> outputs) {

    /**
     * A classifier's output is its class and each class's probability, by the labels the model's
     * bundle gives its classes, in class order; a regressor's is its value.
     */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record ConsumerOutput(
            @Nullable String prediction,
            @Nullable Map<String, Double> probabilities,
            @Nullable Double value) {

        public static ConsumerOutput classifier(String prediction, Map<String, Double> probabilities) {
            return new ConsumerOutput(prediction, probabilities, null);
        }

        public static ConsumerOutput regressor(Double value) {
            return new ConsumerOutput(null, null, value);
        }
    }
}
