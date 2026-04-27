/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.signature.services;

import java.util.List;
import java.util.Map;

import dev.ulloasp.mlsuite.signature.entities.Signature;

public interface SignatureService {

        public Signature createSignature(Long userId, Long organizationId, Long modelId,
                        Map<String, Object> inputSignature, String name,
                        int major, int minor, int patch, Long origin);

        default Signature createSignature(Long userId, Long modelId,
                        Map<String, Object> inputSignature, String name,
                        int major, int minor, int patch, Long origin) {
                return createSignature(userId, userId, modelId, inputSignature, name, major, minor, patch, origin);
        }

        public Signature getSignature(Long userId, Long organizationId, Long signatureId);

        default Signature getSignature(Long userId, Long signatureId) {
                return getSignature(userId, userId, signatureId);
        }

        public List<Signature> getSignatureByModelId(Long userId, Long organizationId, Long modelId);

        default List<Signature> getSignatureByModelId(Long userId, Long modelId) {
                return getSignatureByModelId(userId, userId, modelId);
        }
}
