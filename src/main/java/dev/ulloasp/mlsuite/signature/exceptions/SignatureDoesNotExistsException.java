package dev.ulloasp.mlsuite.signature.exceptions;

public class SignatureDoesNotExistsException extends RuntimeException {

    public SignatureDoesNotExistsException(Long signatureId) {
        super("Signature with ID '" + signatureId + "' does not exist.");
    }

}
