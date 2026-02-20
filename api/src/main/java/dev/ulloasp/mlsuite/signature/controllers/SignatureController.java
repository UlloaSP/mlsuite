/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.signature.controllers;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import dev.ulloasp.mlsuite.signature.dtos.CreateSignatureParams;
import dev.ulloasp.mlsuite.signature.dtos.SignatureDto;

@RequestMapping("/api/signature")
public interface SignatureController {

        @PostMapping("/create")
        ResponseEntity<SignatureDto> createSignature(OAuth2AuthenticationToken authentication,
                        @RequestBody CreateSignatureParams params);

        @GetMapping("/all")
        public ResponseEntity<List<SignatureDto>> getAllSignatures(OAuth2AuthenticationToken authentication,
                        @RequestParam Long modelId);

        @GetMapping("/{signatureId}")
        public ResponseEntity<SignatureDto> getSignatureById(OAuth2AuthenticationToken authentication,
                        @PathVariable Long signatureId);

}
