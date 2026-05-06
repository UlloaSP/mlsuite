/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.signature.adapter.in.web;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import dev.ulloasp.mlsuite.signature.application.dto.CreateSignatureParams;
import dev.ulloasp.mlsuite.signature.application.dto.SignatureDto;
import jakarta.validation.Valid;

@RequestMapping("/api/signatures")
public interface SignatureController {

        @PostMapping
        ResponseEntity<SignatureDto> createSignature(Authentication authentication,
                        @Valid @RequestBody CreateSignatureParams params);

        @GetMapping
        public ResponseEntity<List<SignatureDto>> getAllSignatures(Authentication authentication,
                        @RequestParam Long modelId);

        @GetMapping("/{signatureId}")
        public ResponseEntity<SignatureDto> getSignatureById(Authentication authentication,
                        @PathVariable Long signatureId);

}

