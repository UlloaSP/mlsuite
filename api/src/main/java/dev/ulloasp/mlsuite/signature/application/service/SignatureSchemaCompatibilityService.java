package dev.ulloasp.mlsuite.signature.application.service;

import java.util.Map;

public interface SignatureSchemaCompatibilityService {

    void validate(Long userId, Map<String, Object> inputSignature);
}

