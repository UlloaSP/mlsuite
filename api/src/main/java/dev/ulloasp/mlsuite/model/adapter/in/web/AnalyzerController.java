/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.model.adapter.in.web;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import dev.ulloasp.mlsuite.model.application.dto.ExplainRequest;
import dev.ulloasp.mlsuite.model.application.port.in.AnalyzerUseCase;
import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/analyzer")
public class AnalyzerController {

    private final AnalyzerUseCase analyzerUseCase;

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

