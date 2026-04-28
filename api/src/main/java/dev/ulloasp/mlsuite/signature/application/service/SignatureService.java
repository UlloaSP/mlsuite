/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.signature.application.service;

import java.util.List;
import java.util.Map;

import dev.ulloasp.mlsuite.signature.application.port.in.SignatureCatalogUseCase;
import dev.ulloasp.mlsuite.signature.domain.model.Signature;

public interface SignatureService extends SignatureCatalogUseCase {

        public Signature createSignature(Long userId, Long modelId,
                        Map<String, Object> inputSignature, String name,
                        int major, int minor, int patch, Long origin);

        public Signature getSignature(Long userId, Long signatureId);

        public List<Signature> getSignatureByModelId(Long userId, Long modelId);
}

