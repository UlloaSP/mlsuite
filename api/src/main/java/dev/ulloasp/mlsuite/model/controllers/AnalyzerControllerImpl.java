/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.model.controllers;

import java.time.Instant;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import dev.ulloasp.mlsuite.model.dtos.ExplainRequest;
import dev.ulloasp.mlsuite.model.exceptions.AnalyzerServiceException;
import dev.ulloasp.mlsuite.model.services.AnalyzerService;
import dev.ulloasp.mlsuite.rbac.RbacPermissions;
import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import dev.ulloasp.mlsuite.security.identity.CurrentUserResolver;
import dev.ulloasp.mlsuite.util.ErrorDto;
import jakarta.annotation.Nullable;
import jakarta.servlet.http.HttpServletRequest;

@RestController
public class AnalyzerControllerImpl implements AnalyzerController {

    private final CurrentUserResolver currentUserResolver;
    private final AnalyzerService analyzerService;

    public AnalyzerControllerImpl(CurrentUserResolver currentUserResolver, AnalyzerService analyzerService) {
        this.currentUserResolver = currentUserResolver;
        this.analyzerService = analyzerService;
    }

    @Override
    public ResponseEntity<Map<String, Object>> generateSchema(
            Authentication authentication,
            @RequestPart("model") MultipartFile model,
            @Nullable @RequestPart(value = "dataframe", required = false) MultipartFile dataframe) {
        CurrentUser currentUser = currentUserResolver.resolve(authentication);
        require(currentUser, RbacPermissions.SIGNATURES_CREATE);
        Map<String, Object> schema = analyzerService.generateInputSignature(
                currentUser.userId(),
                model,
                dataframe);

        return ResponseEntity.ok(schema);
    }

    @Override
    public ResponseEntity<Map<String, Object>> predict(
            Authentication authentication,
            @RequestParam Long modelId,
            @RequestPart("data") Map<String, Object> data) {
        CurrentUser currentUser = currentUserResolver.resolve(authentication);
        require(currentUser, RbacPermissions.PREDICTIONS_CREATE);
        Map<String, Object> prediction = analyzerService.predict(
                currentUser.userId(),
                currentUser.activeOrganizationId(),
                modelId,
                data);
        return ResponseEntity.ok(prediction);
    }

    @Override
    public ResponseEntity<Map<String, Object>> explain(
            Authentication authentication,
            @RequestParam Long modelId,
            @RequestBody ExplainRequest request) {
        CurrentUser currentUser = currentUserResolver.resolve(authentication);
        require(currentUser, RbacPermissions.PREDICTIONS_CREATE);
        Map<String, Object> result = analyzerService.explain(
                currentUser.userId(),
                currentUser.activeOrganizationId(),
                modelId,
                request);
        return ResponseEntity.ok(result);
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

    private void require(CurrentUser currentUser, String permission) {
        if (!currentUser.permissions().contains(permission)) {
            throw new dev.ulloasp.mlsuite.security.tenant.PermissionDeniedException(permission);
        }
    }

}
