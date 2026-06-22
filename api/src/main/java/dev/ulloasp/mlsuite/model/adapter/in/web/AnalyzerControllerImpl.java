/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.model.adapter.in.web;

import java.util.Map;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import dev.ulloasp.mlsuite.model.application.dto.ExplainRequest;
import dev.ulloasp.mlsuite.model.application.port.in.AnalyzerUseCase;
import dev.ulloasp.mlsuite.security.identity.CurrentUserResolver;
import jakarta.annotation.Nullable;
import jakarta.validation.Valid;

@RestController
public class AnalyzerControllerImpl implements AnalyzerController {

    private final CurrentUserResolver currentUserResolver;
    private final AnalyzerUseCase analyzerUseCase;

    public AnalyzerControllerImpl(CurrentUserResolver currentUserResolver, AnalyzerUseCase analyzerUseCase) {
        this.currentUserResolver = currentUserResolver;
        this.analyzerUseCase = analyzerUseCase;
    }

    @Override
    public ResponseEntity<Map<String, Object>> generateSchema(
            Authentication authentication,
            @RequestPart("model") MultipartFile model,
            @Nullable @RequestPart(value = "dataframe", required = false) MultipartFile dataframe,
            @RequestParam(defaultValue = "__") String oneHotSeparator) {
        Map<String, Object> schema = analyzerUseCase.generateInputSchema(
                currentUserResolver.resolve(authentication).userId(),
                model,
                dataframe,
                oneHotSeparator);
        return ResponseEntity.ok(schema);
    }

    @Override
    public ResponseEntity<Map<String, Object>> inspectArtifact(
            Authentication authentication,
            @RequestPart("artifact") MultipartFile artifact) {
        Map<String, Object> inspection = analyzerUseCase.inspectArtifact(
                currentUserResolver.resolve(authentication).userId(),
                artifact);
        return ResponseEntity.ok(inspection);
    }

    @Override
    public ResponseEntity<Map<String, Object>> matchArtifacts(
            Authentication authentication,
            @RequestPart("models") List<MultipartFile> models,
            @RequestPart("dataframes") List<MultipartFile> dataframes) {
        Map<String, Object> matches = analyzerUseCase.matchArtifacts(
                currentUserResolver.resolve(authentication).userId(),
                models,
                dataframes);
        return ResponseEntity.ok(matches);
    }

    @Override
    public ResponseEntity<Map<String, Object>> predict(
            Authentication authentication,
            @RequestParam Long modelId,
            @RequestPart("data") Map<String, Object> data) {
        Map<String, Object> prediction = analyzerUseCase.predict(
                currentUserResolver.resolve(authentication).userId(),
                modelId,
                data);
        return ResponseEntity.ok(prediction);
    }

    @Override
    public ResponseEntity<Map<String, Object>> explain(
            Authentication authentication,
            @RequestParam Long modelId,
            @Valid @RequestBody ExplainRequest request) {
        Map<String, Object> result = analyzerUseCase.explain(
                currentUserResolver.resolve(authentication).userId(),
                modelId,
                request);
        return ResponseEntity.ok(result);
    }
}

