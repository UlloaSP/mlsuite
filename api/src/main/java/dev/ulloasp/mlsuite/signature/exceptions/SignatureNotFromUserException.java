/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.signature.exceptions;

public class SignatureNotFromUserException extends RuntimeException {

    public SignatureNotFromUserException(Long signatureId, String userDisplayName) {
        super("Signature with ID '" + signatureId + "' does not belong to a model property of user: "
                + userDisplayName);
    }

}
