/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.model.controllers;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.multipart.MultipartFile;

import dev.ulloasp.mlsuite.model.dtos.ExplainRequest;
import jakarta.annotation.Nullable;

@RequestMapping("/api/analyzer")
public interface AnalyzerController {

        @PostMapping("/schema/generate")
        public ResponseEntity<Map<String, Object>> generateSchema(
                        Authentication authentication,
                        @RequestPart("model") MultipartFile model,
                        @Nullable @RequestPart(value = "dataframe", required = false) MultipartFile dataframe);

        @PostMapping("/predict/by-id")
        public ResponseEntity<Map<String, Object>> predict(
                        Authentication authentication,
                        @RequestParam Long modelId,
                        @RequestPart("data") Map<String, Object> data);

        @PostMapping("/explain/by-id")
        public ResponseEntity<Map<String, Object>> explain(
                        Authentication authentication,
                        @RequestParam Long modelId,
                        @RequestBody ExplainRequest request);
}
