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

import dev.ulloasp.mlsuite.prediction.dtos.CreateOutputFeedbackParams;
import dev.ulloasp.mlsuite.prediction.dtos.OutputFeedbackDto;
import dev.ulloasp.mlsuite.prediction.dtos.UpdateOutputFeedbackParams;
import dev.ulloasp.mlsuite.prediction.entities.OutputFeedback;
import dev.ulloasp.mlsuite.prediction.exceptions.OutputFeedbackDoesNotExistsException;
import dev.ulloasp.mlsuite.prediction.exceptions.PredictionDoesNotExistsException;
import dev.ulloasp.mlsuite.prediction.services.OutputFeedbackService;
import dev.ulloasp.mlsuite.security.identity.CurrentUserResolver;
import dev.ulloasp.mlsuite.util.ErrorDto;
import jakarta.servlet.http.HttpServletRequest;

@RestController
public class OutputFeedbackControllerImpl implements OutputFeedbackController {

    private final CurrentUserResolver currentUserResolver;
    private final OutputFeedbackService outputFeedbackService;

    public OutputFeedbackControllerImpl(
            CurrentUserResolver currentUserResolver,
            OutputFeedbackService outputFeedbackService) {
        this.currentUserResolver = currentUserResolver;
        this.outputFeedbackService = outputFeedbackService;
    }

    @Override
    public ResponseEntity<OutputFeedbackDto> createOutputFeedback(
            OAuth2AuthenticationToken authentication,
            CreateOutputFeedbackParams params) {
        OutputFeedback outputFeedback = outputFeedbackService.createOutputFeedback(
                currentUserResolver.resolve(authentication).userId(),
                params.getPredictionId(),
                params.getOrder(),
                params.getValue());
        return ResponseEntity.status(HttpStatus.CREATED).body(OutputFeedbackDto.toDto(outputFeedback));
    }

    @Override
    public ResponseEntity<OutputFeedbackDto> updateOutputFeedback(
            OAuth2AuthenticationToken authentication,
            UpdateOutputFeedbackParams params) {
        OutputFeedback outputFeedback = outputFeedbackService.updateOutputFeedback(
                currentUserResolver.resolve(authentication).userId(),
                params.getOutputFeedbackId(),
                params.getValue());
        return ResponseEntity.status(HttpStatus.CREATED).body(OutputFeedbackDto.toDto(outputFeedback));
    }

    @Override
    public ResponseEntity<List<OutputFeedbackDto>> getAllOutputFeedback(
            OAuth2AuthenticationToken authentication,
            Long predictionId) {
        List<OutputFeedback> outputFeedback = outputFeedbackService.getOutputFeedbackByPredictionId(
                currentUserResolver.resolve(authentication).userId(),
                predictionId);
        return ResponseEntity.ok(OutputFeedbackDto.toDtoList(outputFeedback));
    }

    @ExceptionHandler(OutputFeedbackDoesNotExistsException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ResponseEntity<ErrorDto> handleOutputFeedbackDoesNotExistsException(
            OutputFeedbackDoesNotExistsException e,
            HttpServletRequest req) {
        ErrorDto dto = ErrorDto.of(HttpStatus.NOT_FOUND.value(), e.getMessage(), req.getRequestURI());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(dto);
    }

    @ExceptionHandler(PredictionDoesNotExistsException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ResponseEntity<ErrorDto> handlePredictionDoesNotExistsException(
            PredictionDoesNotExistsException e,
            HttpServletRequest req) {
        ErrorDto dto = ErrorDto.of(HttpStatus.NOT_FOUND.value(), e.getMessage(), req.getRequestURI());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(dto);
    }
}
