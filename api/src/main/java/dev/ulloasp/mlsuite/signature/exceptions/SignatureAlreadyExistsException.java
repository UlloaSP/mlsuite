/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.signature.exceptions;

import java.util.Map;

public class SignatureAlreadyExistsException extends RuntimeException {

    public SignatureAlreadyExistsException(Long modelId, Map<String, Object> inputSignature) {
        super("Signature with input '" + inputSignature + "' already exists for model ID: " + modelId);
    }

    public SignatureAlreadyExistsException(Long modelId, int major, int minor, int patch) {
        super("Signature with version '" + major + "." + minor + "." + patch + " already exists for model ID: "
                + modelId);
    }

}
