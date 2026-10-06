package dev.ulloasp.mlsuite.schema.application.port.in;

import dev.ulloasp.mlsuite.schema.application.dto.PublicPredictionDto;
import dev.ulloasp.mlsuite.schema.application.dto.PublicPredictionRequest;

public interface PublicPredictionUseCase {
    /** Runs a published bookmark's models once for anyone, session or not, and keeps no record. */
    PublicPredictionDto run(String publicId, PublicPredictionRequest request);
}
