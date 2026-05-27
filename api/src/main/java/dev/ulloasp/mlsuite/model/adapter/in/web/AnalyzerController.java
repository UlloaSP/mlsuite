/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.model.adapter.in.web;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.multipart.MultipartFile;

import dev.ulloasp.mlsuite.model.application.dto.ExplainRequest;
import jakarta.annotation.Nullable;
import jakarta.validation.Valid;

@RequestMapping("/api/analyzer")
public interface AnalyzerController {

        @PostMapping("/schema")
        public ResponseEntity<Map<String, Object>> generateSchema(
                        Authentication authentication,
                        @RequestPart("model") MultipartFile model,
                        @Nullable @RequestPart(value = "dataframe", required = false) MultipartFile dataframe);

        @PostMapping("/artifacts/inspect")
        public ResponseEntity<Map<String, Object>> inspectArtifact(
                        Authentication authentication,
                        @RequestPart("artifact") MultipartFile artifact);

        @PostMapping("/predictions")
        public ResponseEntity<Map<String, Object>> predict(
                        Authentication authentication,
                        @RequestParam Long modelId,
                        @RequestPart("data") Map<String, Object> data);

        @PostMapping("/explanations")
        public ResponseEntity<Map<String, Object>> explain(
                        Authentication authentication,
                        @RequestParam Long modelId,
                        @Valid @RequestBody ExplainRequest request);
}
