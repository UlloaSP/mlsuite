/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.signature.exceptions;

public class SignatureNotSemVerException extends RuntimeException {
    public SignatureNotSemVerException(String signatureName) {
        super("Cannot create signature with name '" + signatureName
                + "' because it is not a valid semantic versioning (semver) format");
    }
}
