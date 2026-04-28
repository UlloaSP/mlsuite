/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.signature.application.dto;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

import dev.ulloasp.mlsuite.signature.domain.model.Signature;
public record SignatureDto(
        Long id,
        Long modelId,
        String name,
        Map<String, Object> inputSignature,
        int major,
        int minor,
        int patch,
        Long origin,
        OffsetDateTime createdAt) {

    public static final SignatureDto toDto(Signature signature) {
        return new SignatureDto(
                signature.getId(),
                signature.getModel().getId(),
                signature.getName(),
                signature.getInputSignature(),
                signature.getMajor(),
                signature.getMinor(),
                signature.getPatch(),
                signature.getOrigin() != null ? signature.getOrigin().getId() : null,
                signature.getCreatedAt());
    }

    public static final List<SignatureDto> toDtoList(List<Signature> signatures) {
        return signatures.stream()
                .map(SignatureDto::toDto)
                .toList();
    }
}

