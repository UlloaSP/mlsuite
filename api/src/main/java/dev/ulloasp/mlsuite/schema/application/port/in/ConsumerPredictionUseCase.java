package dev.ulloasp.mlsuite.schema.application.port.in;

import dev.ulloasp.mlsuite.schema.application.dto.ConsumerPredictionDto;
import dev.ulloasp.mlsuite.schema.application.dto.ConsumerPredictionRequest;

public interface ConsumerPredictionUseCase {

    /**
     * Runs the model of the bookmark the API key belongs to on one record, keeps the run as the
     * organization's under the key's name, and returns only the model's outputs.
     */
    ConsumerPredictionDto predict(String secret, ConsumerPredictionRequest request);
}
