/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.prediction.controllers;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
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
import dev.ulloasp.mlsuite.rbac.RbacPermissions;
import dev.ulloasp.mlsuite.security.identity.CurrentUser;
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
            Authentication authentication,
            CreateOutputFeedbackParams params) {
        CurrentUser currentUser = currentUserResolver.resolve(authentication);
        require(currentUser, RbacPermissions.FEEDBACK_CREATE);
        OutputFeedback outputFeedback = outputFeedbackService.createOutputFeedback(
                currentUser.userId(),
                currentUser.activeOrganizationId(),
                params.getPredictionId(),
                params.getOrder(),
                params.getValue());
        return ResponseEntity.status(HttpStatus.CREATED).body(OutputFeedbackDto.toDto(outputFeedback));
    }

    @Override
    public ResponseEntity<OutputFeedbackDto> updateOutputFeedback(
            Authentication authentication,
            UpdateOutputFeedbackParams params) {
        CurrentUser currentUser = currentUserResolver.resolve(authentication);
        require(currentUser, RbacPermissions.FEEDBACK_UPDATE);
        OutputFeedback outputFeedback = outputFeedbackService.updateOutputFeedback(
                currentUser.userId(),
                currentUser.activeOrganizationId(),
                params.getOutputFeedbackId(),
                params.getValue());
        return ResponseEntity.status(HttpStatus.CREATED).body(OutputFeedbackDto.toDto(outputFeedback));
    }

    @Override
    public ResponseEntity<List<OutputFeedbackDto>> getAllOutputFeedback(
            Authentication authentication,
            Long predictionId) {
        CurrentUser currentUser = currentUserResolver.resolve(authentication);
        require(currentUser, RbacPermissions.FEEDBACK_READ);
        List<OutputFeedback> outputFeedback = outputFeedbackService.getOutputFeedbackByPredictionId(
                currentUser.userId(),
                currentUser.activeOrganizationId(),
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

    private void require(CurrentUser currentUser, String permission) {
        if (!currentUser.permissions().contains(permission)) {
            throw new dev.ulloasp.mlsuite.security.tenant.PermissionDeniedException(permission);
        }
    }
}
