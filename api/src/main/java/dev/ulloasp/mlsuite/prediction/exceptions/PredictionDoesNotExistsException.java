/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.prediction.exceptions;

public class PredictionDoesNotExistsException extends RuntimeException {

    public PredictionDoesNotExistsException(Long predictionId, String userDisplayName) {
        super("Prediction with ID '" + predictionId + "' does not exist for user: " + userDisplayName);
    }

}
