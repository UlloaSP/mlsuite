/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.prediction.controllers;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import dev.ulloasp.mlsuite.prediction.dtos.CreatePredictionParams;
import dev.ulloasp.mlsuite.prediction.dtos.PredictionDto;
import dev.ulloasp.mlsuite.prediction.dtos.UpdatePredictionParams;

@RequestMapping("/api/prediction")
public interface PredictionController {

        @PostMapping("/create")
        public ResponseEntity<PredictionDto> createPrediction(OAuth2AuthenticationToken authentication,
                        @RequestBody CreatePredictionParams params);

        @PostMapping("/update")
        public ResponseEntity<PredictionDto> updatePrediction(OAuth2AuthenticationToken authentication,
                        @RequestBody UpdatePredictionParams params);

        @GetMapping("/all")
        public ResponseEntity<List<PredictionDto>> getAllPredictions(OAuth2AuthenticationToken authentication,
                        @RequestParam Long signatureId);

}
