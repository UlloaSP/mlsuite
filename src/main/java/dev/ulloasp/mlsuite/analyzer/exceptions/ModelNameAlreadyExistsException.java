package dev.ulloasp.mlsuite.analyzer.exceptions;

public class ModelNameAlreadyExistsException extends RuntimeException {

    public ModelNameAlreadyExistsException(String modelName, String userName) {
        super("Model name '" + modelName + "' already exists for user '" + userName + "'.");
    }
}
