/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.prediction.exceptions;

public class OutputFeedbackDoesNotExistsException extends RuntimeException {

    public OutputFeedbackDoesNotExistsException(Long outputFeedbackId, String username) {
        super("Output feedback " + outputFeedbackId + " does not exist for user \"" + username + "\".");
    }
}
