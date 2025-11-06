/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.signature.dtos;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import dev.ulloasp.mlsuite.signature.entities.Signature;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Setter
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class SignatureDto {
    private Long id;
    private Long modelId;
    private String name;
    private Map<String, Object> inputSignature;
    private int major;
    private int minor;
    private int patch;
    private Long origin;
    private OffsetDateTime createdAt;

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
                .collect(Collectors.toList());
    }
}
