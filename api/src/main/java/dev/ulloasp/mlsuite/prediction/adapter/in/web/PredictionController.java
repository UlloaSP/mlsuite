/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.prediction.adapter.in.web;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import dev.ulloasp.mlsuite.prediction.application.dto.CreatePredictionParams;
import dev.ulloasp.mlsuite.prediction.application.dto.PredictionDto;
import dev.ulloasp.mlsuite.prediction.application.dto.PredictionSequenceDto;
import dev.ulloasp.mlsuite.prediction.application.dto.UpdatePredictionParams;
import jakarta.validation.Valid;

@RequestMapping("/api/predictions")
public interface PredictionController {

        @PostMapping
        public ResponseEntity<PredictionDto> createPrediction(Authentication authentication,
                        @Valid @RequestBody CreatePredictionParams params);

        @PatchMapping
        public ResponseEntity<PredictionDto> updatePrediction(Authentication authentication,
                        @Valid @RequestBody UpdatePredictionParams params);

        @GetMapping
        public ResponseEntity<List<PredictionDto>> getAllPredictions(Authentication authentication,
                        @RequestParam Long signatureId);

        @GetMapping("/last-id")
        public ResponseEntity<PredictionSequenceDto> getLastPredictionId(Authentication authentication);

}

