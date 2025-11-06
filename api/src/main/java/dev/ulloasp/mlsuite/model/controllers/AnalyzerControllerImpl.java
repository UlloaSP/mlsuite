/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.model.controllers;

import java.time.Instant;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import dev.ulloasp.mlsuite.model.exceptions.AnalyzerServiceException;
import dev.ulloasp.mlsuite.model.services.AnalyzerService;
import dev.ulloasp.mlsuite.user.entity.OAuthProvider;
import dev.ulloasp.mlsuite.util.ErrorDto;
import jakarta.annotation.Nullable;
import jakarta.servlet.http.HttpServletRequest;

@RestController
public class AnalyzerControllerImpl implements AnalyzerController {

    private final AnalyzerService analyzerService;

    public AnalyzerControllerImpl(AnalyzerService analyzerService) {
        this.analyzerService = analyzerService;
    }

    @Override
    public ResponseEntity<Map<String, Object>> generateSchema(
            OAuth2AuthenticationToken authentication,
            @RequestPart("model") MultipartFile model,
            @Nullable @RequestPart(value = "dataframe", required = false) MultipartFile dataframe) {
        Map<String, Object> schema = analyzerService.generateInputSignature(
                OAuthProvider.fromString(authentication.getAuthorizedClientRegistrationId()),
                authentication.getPrincipal().getName(),
                model,
                dataframe);

        return ResponseEntity.ok(schema);
    }

    @Override
    public ResponseEntity<Map<String, Object>> predict(
            OAuth2AuthenticationToken authentication,
            @RequestParam Long modelId,
            @RequestBody Map<String, Object> data) {
        Map<String, Object> prediction = analyzerService.predict(
                OAuthProvider.fromString(authentication.getAuthorizedClientRegistrationId()),
                authentication.getPrincipal().getName(),
                modelId,
                data);
        return ResponseEntity.ok(prediction);
    }

    @ExceptionHandler(AnalyzerServiceException.class)
    public ResponseEntity<ErrorDto> handleAnalyzer(AnalyzerServiceException ex, HttpServletRequest req) {
        // If upstream gave us a real HTTP status, reuse it. Otherwise treat as
        // 502/Service issue.
        HttpStatus status = ex.getStatus() > 0 ? HttpStatus.valueOf(ex.getStatus()) : HttpStatus.BAD_GATEWAY;
        var dto = new ErrorDto(
                Instant.now(),
                status.value(),
                (ex.getDetail() == null || ex.getDetail().isBlank()) ? "Analyzer Error" : ex.getDetail(),
                req.getRequestURI());
        return ResponseEntity.status(status).body(dto);
    }

}
