/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.prediction.exceptions;

public class PredictionAlreadyExistsException extends RuntimeException {
    public PredictionAlreadyExistsException(String predictionName, String signatureName) {
        super("Signature with name '" + signatureName + "' already has a prediction with name '" + predictionName
                + "'");
    }
}
