package dev.ulloasp.mlsuite.analyzer.exceptions;

public class ModelNotFromUserException extends RuntimeException {

    public ModelNotFromUserException(Long modelId, String modelName, String userName) {
        super("Model with ID '" + modelId + "' and name '" + modelName + "' does not belong to user '" + userName + "'.");
    }
    
}
