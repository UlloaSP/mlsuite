package dev.ulloasp.mlsuite.signature.exceptions;

import java.util.Map;

public class SignatureAlreadyExistsException extends RuntimeException {

    public SignatureAlreadyExistsException(Long modelId, Map<String, Object> inputSignature) {
        super("Signature with input '" + inputSignature + "' already exists for model ID: " + modelId);
    }

}
