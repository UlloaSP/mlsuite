package dev.ulloasp.mlsuite.analyzer.exceptions;

public class SignatureNotFromUserException extends RuntimeException {

    public SignatureNotFromUserException(Long signatureId, String userDisplayName) {
        super("Signature with ID '" + signatureId + "' does not belong to a model property of user: "
                + userDisplayName);
    }

}
