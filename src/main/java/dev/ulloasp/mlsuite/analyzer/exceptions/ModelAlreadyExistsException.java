package dev.ulloasp.mlsuite.analyzer.exceptions;

public class ModelAlreadyExistsException extends RuntimeException {

    public ModelAlreadyExistsException(String modelName, String userName) {
        super("Model '" + modelName + "' already exists for user '" + userName + "'.");
    }

}
