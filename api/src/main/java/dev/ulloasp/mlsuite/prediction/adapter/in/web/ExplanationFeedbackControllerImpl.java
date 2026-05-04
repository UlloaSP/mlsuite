/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.prediction.adapter.in.web;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.web.bind.annotation.RestController;

import dev.ulloasp.mlsuite.prediction.application.dto.CreateExplanationFeedbackParams;
import dev.ulloasp.mlsuite.prediction.application.dto.ExplanationFeedbackDto;
import dev.ulloasp.mlsuite.prediction.application.dto.UpdateExplanationFeedbackParams;
import dev.ulloasp.mlsuite.prediction.application.port.in.ExplanationFeedbackCatalogUseCase;
import dev.ulloasp.mlsuite.prediction.domain.model.ExplanationFeedback;
import dev.ulloasp.mlsuite.security.identity.CurrentUserResolver;
import jakarta.validation.Valid;

@RestController
public class ExplanationFeedbackControllerImpl implements ExplanationFeedbackController {

    private final CurrentUserResolver currentUserResolver;
    private final ExplanationFeedbackCatalogUseCase explanationFeedbackCatalogUseCase;

    public ExplanationFeedbackControllerImpl(
            CurrentUserResolver currentUserResolver,
            ExplanationFeedbackCatalogUseCase explanationFeedbackCatalogUseCase) {
        this.currentUserResolver = currentUserResolver;
        this.explanationFeedbackCatalogUseCase = explanationFeedbackCatalogUseCase;
    }

    @Override
    public ResponseEntity<ExplanationFeedbackDto> createExplanationFeedback(
            OAuth2AuthenticationToken authentication,
            @Valid CreateExplanationFeedbackParams params) {
        ExplanationFeedback explanationFeedback = explanationFeedbackCatalogUseCase.createExplanationFeedback(
                currentUserResolver.resolve(authentication).userId(),
                params.predictionId(),
                params.order(),
                params.value());
        return ResponseEntity.status(HttpStatus.CREATED).body(ExplanationFeedbackDto.toDto(explanationFeedback));
    }

    @Override
    public ResponseEntity<ExplanationFeedbackDto> updateExplanationFeedback(
            OAuth2AuthenticationToken authentication,
            @Valid UpdateExplanationFeedbackParams params) {
        ExplanationFeedback explanationFeedback = explanationFeedbackCatalogUseCase.updateExplanationFeedback(
                currentUserResolver.resolve(authentication).userId(),
                params.explanationFeedbackId(),
                params.realValue());
        return ResponseEntity.status(HttpStatus.CREATED).body(ExplanationFeedbackDto.toDto(explanationFeedback));
    }

    @Override
    public ResponseEntity<List<ExplanationFeedbackDto>> getAllExplanationFeedback(
            OAuth2AuthenticationToken authentication,
            Long predictionId) {
        List<ExplanationFeedback> explanationFeedback = explanationFeedbackCatalogUseCase.getExplanationFeedbackByPredictionId(
                currentUserResolver.resolve(authentication).userId(),
                predictionId);
        return ResponseEntity.ok(ExplanationFeedbackDto.toDtoList(explanationFeedback));
    }
}

