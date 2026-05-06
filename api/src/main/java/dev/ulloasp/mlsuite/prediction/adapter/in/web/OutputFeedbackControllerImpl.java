/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.prediction.adapter.in.web;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.RestController;

import dev.ulloasp.mlsuite.prediction.application.dto.CreateOutputFeedbackParams;
import dev.ulloasp.mlsuite.prediction.application.dto.OutputFeedbackDto;
import dev.ulloasp.mlsuite.prediction.application.dto.UpdateOutputFeedbackParams;
import dev.ulloasp.mlsuite.prediction.application.port.in.OutputFeedbackCatalogUseCase;
import dev.ulloasp.mlsuite.prediction.domain.model.OutputFeedback;
import dev.ulloasp.mlsuite.security.identity.CurrentUserResolver;
import jakarta.validation.Valid;

@RestController
public class OutputFeedbackControllerImpl implements OutputFeedbackController {

    private final CurrentUserResolver currentUserResolver;
    private final OutputFeedbackCatalogUseCase outputFeedbackCatalogUseCase;

    public OutputFeedbackControllerImpl(
            CurrentUserResolver currentUserResolver,
            OutputFeedbackCatalogUseCase outputFeedbackCatalogUseCase) {
        this.currentUserResolver = currentUserResolver;
        this.outputFeedbackCatalogUseCase = outputFeedbackCatalogUseCase;
    }

    @Override
    public ResponseEntity<OutputFeedbackDto> createOutputFeedback(
            Authentication authentication,
            @Valid CreateOutputFeedbackParams params) {
        OutputFeedback outputFeedback = outputFeedbackCatalogUseCase.createOutputFeedback(
                currentUserResolver.resolve(authentication).userId(),
                params.predictionId(),
                params.order(),
                params.value());
        return ResponseEntity.status(HttpStatus.CREATED).body(OutputFeedbackDto.toDto(outputFeedback));
    }

    @Override
    public ResponseEntity<OutputFeedbackDto> updateOutputFeedback(
            Authentication authentication,
            @Valid UpdateOutputFeedbackParams params) {
        OutputFeedback outputFeedback = outputFeedbackCatalogUseCase.updateOutputFeedback(
                currentUserResolver.resolve(authentication).userId(),
                params.outputFeedbackId(),
                params.value());
        return ResponseEntity.status(HttpStatus.CREATED).body(OutputFeedbackDto.toDto(outputFeedback));
    }

    @Override
    public ResponseEntity<List<OutputFeedbackDto>> getAllOutputFeedback(
            Authentication authentication,
            Long predictionId) {
        List<OutputFeedback> outputFeedback = outputFeedbackCatalogUseCase.getOutputFeedbackByPredictionId(
                currentUserResolver.resolve(authentication).userId(),
                predictionId);
        return ResponseEntity.ok(OutputFeedbackDto.toDtoList(outputFeedback));
    }
}

