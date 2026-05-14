/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.prediction.adapter.in.web;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import dev.ulloasp.mlsuite.prediction.application.dto.CreatePredictionParams;
import dev.ulloasp.mlsuite.prediction.application.dto.PredictionDto;
import dev.ulloasp.mlsuite.prediction.application.dto.PredictionSequenceDto;
import dev.ulloasp.mlsuite.prediction.application.dto.UpdatePredictionParams;
import dev.ulloasp.mlsuite.prediction.application.port.in.PredictionCatalogUseCase;
import dev.ulloasp.mlsuite.prediction.domain.model.Prediction;
import dev.ulloasp.mlsuite.prediction.domain.model.PredictionStatus;
import dev.ulloasp.mlsuite.security.identity.CurrentUserResolver;
import jakarta.validation.Valid;

@RestController
public class PredictionControllerImpl implements PredictionController {

    private final CurrentUserResolver currentUserResolver;
    private final PredictionCatalogUseCase predictionCatalogUseCase;

    public PredictionControllerImpl(
            CurrentUserResolver currentUserResolver,
            PredictionCatalogUseCase predictionCatalogUseCase) {
        this.currentUserResolver = currentUserResolver;
        this.predictionCatalogUseCase = predictionCatalogUseCase;
    }

    @Override
    public ResponseEntity<PredictionDto> createPrediction(
            Authentication authentication,
            @Valid @RequestBody CreatePredictionParams params) {
        Prediction pred = predictionCatalogUseCase.createPrediction(
                currentUserResolver.resolve(authentication).userId(),
                params.signatureId(),
                params.name(),
                params.overwrite(),
                params.prediction(),
                params.inputs());
        return ResponseEntity.status(HttpStatus.CREATED).body(PredictionDto.toDto(pred));
    }

    @Override
    public ResponseEntity<PredictionDto> updatePrediction(
            Authentication authentication,
            @Valid @RequestBody UpdatePredictionParams params) {
        Prediction updatedPrediction = predictionCatalogUseCase.updatePrediction(
                currentUserResolver.resolve(authentication).userId(),
                params.predictionId(),
                PredictionStatus.valueOf(params.status()));
        return ResponseEntity.status(HttpStatus.CREATED).body(PredictionDto.toDto(updatedPrediction));
    }

    @Override
    public ResponseEntity<List<PredictionDto>> getAllPredictions(
            Authentication authentication,
            @RequestParam Long signatureId) {
        List<Prediction> predictions = predictionCatalogUseCase.getPredictionsBySignatureId(
                currentUserResolver.resolve(authentication).userId(),
                signatureId);
        return ResponseEntity.ok(PredictionDto.toDtoList(predictions));
    }

    @Override
    public ResponseEntity<PredictionSequenceDto> getLastPredictionId(Authentication authentication) {
        Long lastId = predictionCatalogUseCase.getLastPredictionId(
                currentUserResolver.resolve(authentication).userId());
        return ResponseEntity.ok(new PredictionSequenceDto(lastId));
    }
}

