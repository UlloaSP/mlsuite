/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.prediction.controllers;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import dev.ulloasp.mlsuite.prediction.dtos.CreateExplanationFeedbackParams;
import dev.ulloasp.mlsuite.prediction.dtos.ExplanationFeedbackDto;
import dev.ulloasp.mlsuite.prediction.dtos.UpdateExplanationFeedbackParams;
import dev.ulloasp.mlsuite.prediction.entities.ExplanationFeedback;
import dev.ulloasp.mlsuite.prediction.exceptions.ExplanationFeedbackDoesNotExistsException;
import dev.ulloasp.mlsuite.prediction.exceptions.PredictionDoesNotExistsException;
import dev.ulloasp.mlsuite.prediction.services.ExplanationFeedbackService;
import dev.ulloasp.mlsuite.security.identity.CurrentUserResolver;
import dev.ulloasp.mlsuite.util.ErrorDto;
import jakarta.servlet.http.HttpServletRequest;

@RestController
public class ExplanationFeedbackControllerImpl implements ExplanationFeedbackController {

    private final CurrentUserResolver currentUserResolver;
    private final ExplanationFeedbackService explanationFeedbackService;

    public ExplanationFeedbackControllerImpl(CurrentUserResolver currentUserResolver,
            ExplanationFeedbackService explanationFeedbackService) {
        this.currentUserResolver = currentUserResolver;
        this.explanationFeedbackService = explanationFeedbackService;
    }

    @Override
    public ResponseEntity<ExplanationFeedbackDto> createExplanationFeedback(OAuth2AuthenticationToken authentication,
            CreateExplanationFeedbackParams params) {
        ExplanationFeedback explanationFeedback = explanationFeedbackService.createExplanationFeedback(
                currentUserResolver.resolve(authentication).userId(), params.getPredictionId(), params.getOrder(),
                params.getValue());
        return ResponseEntity.status(HttpStatus.CREATED).body(ExplanationFeedbackDto.toDto(explanationFeedback));
    }

    @Override
    public ResponseEntity<ExplanationFeedbackDto> updateExplanationFeedback(OAuth2AuthenticationToken authentication,
            UpdateExplanationFeedbackParams params) {
        ExplanationFeedback explanationFeedback = explanationFeedbackService.updateExplanationFeedback(
                currentUserResolver.resolve(authentication).userId(), params.getExplanationFeedbackId(),
                params.getRealValue());
        return ResponseEntity.status(HttpStatus.CREATED).body(ExplanationFeedbackDto.toDto(explanationFeedback));
    }

    @Override
    public ResponseEntity<List<ExplanationFeedbackDto>> getAllExplanationFeedback(
            OAuth2AuthenticationToken authentication, Long predictionId) {
        List<ExplanationFeedback> explanationFeedback = explanationFeedbackService.getExplanationFeedbackByPredictionId(
                currentUserResolver.resolve(authentication).userId(), predictionId);
        return ResponseEntity.ok(ExplanationFeedbackDto.toDtoList(explanationFeedback));
    }

    @ExceptionHandler(ExplanationFeedbackDoesNotExistsException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ResponseEntity<ErrorDto> handleExplanationFeedbackDoesNotExistsException(
            ExplanationFeedbackDoesNotExistsException e, HttpServletRequest req) {
        ErrorDto dto = ErrorDto.of(HttpStatus.NOT_FOUND.value(), e.getMessage(), req.getRequestURI());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(dto);
    }

    @ExceptionHandler(PredictionDoesNotExistsException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ResponseEntity<ErrorDto> handlePredictionDoesNotExistsException(PredictionDoesNotExistsException e,
            HttpServletRequest req) {
        ErrorDto dto = ErrorDto.of(HttpStatus.NOT_FOUND.value(), e.getMessage(), req.getRequestURI());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(dto);
    }
}
