package dev.ulloasp.mlsuite.apiaccess.application.port.in;

import dev.ulloasp.mlsuite.apiaccess.application.dto.ApiPredictionDto;

public interface ApiPredictionUseCase {

    /**
     * Runs the bookmark clients know as {@code bookmarkId} for the holder of {@code secret}.
     * Refusals are thrown as {@code ApiProblem}.
     */
    ApiPredictionDto predict(String secret, String bookmarkId, String body);
}
