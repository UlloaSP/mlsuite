/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.signature.adapter.in.web;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import dev.ulloasp.mlsuite.security.identity.CurrentUserResolver;
import dev.ulloasp.mlsuite.signature.application.dto.CreateSignatureParams;
import dev.ulloasp.mlsuite.signature.application.dto.SignatureDto;
import dev.ulloasp.mlsuite.signature.application.port.in.SignatureCatalogUseCase;
import dev.ulloasp.mlsuite.signature.domain.model.Signature;
import jakarta.validation.Valid;

@RestController
public class SignatureControllerImpl implements SignatureController {

    private final CurrentUserResolver currentUserResolver;
    private final SignatureCatalogUseCase signatureCatalogUseCase;

    public SignatureControllerImpl(CurrentUserResolver currentUserResolver, SignatureCatalogUseCase signatureCatalogUseCase) {
        this.currentUserResolver = currentUserResolver;
        this.signatureCatalogUseCase = signatureCatalogUseCase;
    }

    @Override
    public ResponseEntity<SignatureDto> createSignature(
            Authentication authentication,
            @Valid @RequestBody CreateSignatureParams params) {
        Signature signature = signatureCatalogUseCase.createSignature(
                currentUserResolver.resolve(authentication).userId(),
                params.modelId(),
                params.inputSignature(),
                params.name(),
                params.major(),
                params.minor(),
                params.patch(),
                params.origin());
        return ResponseEntity.status(HttpStatus.CREATED).body(SignatureDto.toDto(signature));
    }

    @Override
    public ResponseEntity<List<SignatureDto>> getAllSignatures(
            Authentication authentication,
            @RequestParam Long modelId) {
        List<Signature> signatures = signatureCatalogUseCase.getSignatureByModelId(
                currentUserResolver.resolve(authentication).userId(),
                modelId);
        return ResponseEntity.ok(SignatureDto.toDtoList(signatures));
    }

    @Override
    public ResponseEntity<SignatureDto> getSignatureById(
            Authentication authentication,
            @PathVariable Long signatureId) {
        Signature signature = signatureCatalogUseCase.getSignature(
                currentUserResolver.resolve(authentication).userId(),
                signatureId);
        return ResponseEntity.ok(SignatureDto.toDto(signature));
    }
}

