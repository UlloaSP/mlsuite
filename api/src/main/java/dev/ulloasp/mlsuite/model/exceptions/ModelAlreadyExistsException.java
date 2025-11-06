/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.model.exceptions;

public class ModelAlreadyExistsException extends RuntimeException {

    public ModelAlreadyExistsException(String modelName, String userName) {
        super("Model '" + modelName + "' already exists for user '" + userName + "'.");
    }

}
