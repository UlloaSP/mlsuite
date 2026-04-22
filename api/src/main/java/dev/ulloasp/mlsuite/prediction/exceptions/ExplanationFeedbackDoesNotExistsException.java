/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.prediction.exceptions;

public class ExplanationFeedbackDoesNotExistsException extends RuntimeException {

    public ExplanationFeedbackDoesNotExistsException(Long explanationFeedbackId, String username) {
        super("Explanation feedback with id '" + explanationFeedbackId + "' does not exist for user '" + username + "'.");
    }
}
