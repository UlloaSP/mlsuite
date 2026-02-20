/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.model.exceptions;

public class ModelDoesNotExistsException extends RuntimeException {

    public ModelDoesNotExistsException(Long modelId, String userName) {
        super("Model with ID '" + modelId + "' does not exist for user '" + userName + "'.");
    }
}
