package dev.ulloasp.mlsuite.analyzer.exceptions;

public class SignatureAlreadyExistsException extends RuntimeException {

    public SignatureAlreadyExistsException(Long modelId, String inputSignature) {
        super("Signature with input '" + inputSignature + "' already exists for model ID: " + modelId);
    }
    
}
