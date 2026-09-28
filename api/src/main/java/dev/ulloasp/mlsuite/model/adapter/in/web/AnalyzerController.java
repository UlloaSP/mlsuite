/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.model.adapter.in.web;

import java.util.Map;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import dev.ulloasp.mlsuite.model.application.dto.ExplainRequest;
import dev.ulloasp.mlsuite.model.application.port.in.AnalyzerUseCase;
import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import jakarta.annotation.Nullable;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/analyzer")
public class AnalyzerController {

    private final AnalyzerUseCase analyzerUseCase;

    @PostMapping("/schema")
    public ResponseEntity<Map<String, Object>> generateSchema(
            CurrentUser user,
            @RequestPart("model") MultipartFile model,
            @Nullable @RequestPart(value = "dataframe", required = false) MultipartFile dataframe,
            @RequestParam(defaultValue = "__") String oneHotSeparator) {
        Map<String, Object> schema = analyzerUseCase.generateInputSchema(
                user.userId(),
                model,
                dataframe,
                oneHotSeparator);
        return ResponseEntity.ok(schema);
    }

    @PostMapping("/artifacts/inspect")
    public ResponseEntity<Map<String, Object>> inspectArtifact(
            CurrentUser user,
            @RequestPart("artifact") MultipartFile artifact) {
        Map<String, Object> inspection = analyzerUseCase.inspectArtifact(
                user.userId(),
                artifact);
        return ResponseEntity.ok(inspection);
    }

    @PostMapping("/artifacts/match")
    public ResponseEntity<Map<String, Object>> matchArtifacts(
            CurrentUser user,
            @RequestPart("models") List<MultipartFile> models,
            @RequestPart("dataframes") List<MultipartFile> dataframes) {
        Map<String, Object> matches = analyzerUseCase.matchArtifacts(
                user.userId(),
                models,
                dataframes);
        return ResponseEntity.ok(matches);
    }

    @PostMapping("/predictions")
    public ResponseEntity<Map<String, Object>> predict(
            CurrentUser user,
            @RequestParam Long modelId,
            @RequestPart("data") Map<String,
            Object> data) {
        Map<String, Object> prediction = analyzerUseCase.predict(
                user.userId(),
                modelId,
                data);
        return ResponseEntity.ok(prediction);
    }

    @PostMapping("/explanations")
    public ResponseEntity<Map<String, Object>> explain(
            CurrentUser user,
            @RequestParam Long modelId,
            @Valid @RequestBody ExplainRequest request) {
        Map<String, Object> result = analyzerUseCase.explain(
                user.userId(),
                modelId,
                request);
        return ResponseEntity.ok(result);
    }
}

