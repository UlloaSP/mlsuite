/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.model.application.dto;

import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.signature.application.dto.SignatureDto;
import dev.ulloasp.mlsuite.signature.domain.model.Signature;
import jakarta.annotation.Nullable;

public record CreateModelDto(
        ModelDto model,
        SignatureDto signatureFromModel,
        @Nullable SignatureDto signatureFromDataframe) {

    public static final CreateModelDto toDto(Model model, Signature signatureFromModel,
            Signature signatureFromDataframe) {
        return new CreateModelDto(
                ModelDto.toDto(model),
                SignatureDto.toDto(signatureFromModel),
                signatureFromDataframe != null ? SignatureDto.toDto(signatureFromDataframe) : null);
    }
}

