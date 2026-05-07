/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.util;

import java.time.Instant;
import java.util.stream.Collectors;

import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import dev.ulloasp.mlsuite.model.domain.exception.AnalyzerServiceException;
import dev.ulloasp.mlsuite.model.domain.exception.ModelAlreadyExistsException;
import dev.ulloasp.mlsuite.model.domain.exception.ModelDoesNotExistsException;
import dev.ulloasp.mlsuite.model.domain.exception.ModelNotFromUserException;
import dev.ulloasp.mlsuite.invitation.domain.exception.InvitationNotFoundException;
import dev.ulloasp.mlsuite.organization.domain.exception.OrganizationAccessDeniedException;
import dev.ulloasp.mlsuite.organization.domain.exception.OrganizationAlreadyExistsException;
import dev.ulloasp.mlsuite.organization.domain.exception.OrganizationNotFoundException;
import dev.ulloasp.mlsuite.admin.infrastructure.OpsAgentException;
import dev.ulloasp.mlsuite.plugin.domain.exception.PluginNotFoundException;
import dev.ulloasp.mlsuite.prediction.domain.exception.ExplanationFeedbackDoesNotExistsException;
import dev.ulloasp.mlsuite.prediction.domain.exception.OutputFeedbackDoesNotExistsException;
import dev.ulloasp.mlsuite.prediction.domain.exception.PredictionAlreadyExistsException;
import dev.ulloasp.mlsuite.prediction.domain.exception.PredictionDoesNotExistsException;
import dev.ulloasp.mlsuite.prediction.domain.exception.TargetDoesNotExistsException;
import dev.ulloasp.mlsuite.signature.domain.exception.InvalidSignatureSchemaException;
import dev.ulloasp.mlsuite.signature.domain.exception.SignatureAlreadyExistsException;
import dev.ulloasp.mlsuite.signature.domain.exception.SignatureDoesNotExistsException;
import dev.ulloasp.mlsuite.signature.domain.exception.SignatureNotFromUserException;
import dev.ulloasp.mlsuite.signature.domain.exception.SignatureNotSemVerException;
import dev.ulloasp.mlsuite.team.domain.exception.TeamNotFoundException;
import dev.ulloasp.mlsuite.user.domain.exception.UserAlreadyExistsException;
import dev.ulloasp.mlsuite.user.domain.exception.UserDoesNotExistException;
import jakarta.servlet.http.HttpServletRequest;

@Order(Ordered.HIGHEST_PRECEDENCE)
@RestControllerAdvice
public class DomainExceptionHandler {

    // ---- 404 NOT FOUND ----

    @ExceptionHandler({
            ModelDoesNotExistsException.class,
            SignatureDoesNotExistsException.class,
            PredictionDoesNotExistsException.class,
            TargetDoesNotExistsException.class,
            OutputFeedbackDoesNotExistsException.class,
            ExplanationFeedbackDoesNotExistsException.class,
            PluginNotFoundException.class,
            UserDoesNotExistException.class,
            OrganizationNotFoundException.class,
            TeamNotFoundException.class,
            InvitationNotFoundException.class
    })
    public ResponseEntity<ErrorDto> handleNotFound(RuntimeException ex, HttpServletRequest req) {
        return respond(HttpStatus.NOT_FOUND, ex, req);
    }

    // ---- 409 CONFLICT ----

    @ExceptionHandler({
            ModelAlreadyExistsException.class,
            SignatureAlreadyExistsException.class,
            PredictionAlreadyExistsException.class,
            UserAlreadyExistsException.class,
            OrganizationAlreadyExistsException.class
    })
    public ResponseEntity<ErrorDto> handleConflict(RuntimeException ex, HttpServletRequest req) {
        return respond(HttpStatus.CONFLICT, ex, req);
    }

    // ---- 403 FORBIDDEN ----

    @ExceptionHandler({
            ModelNotFromUserException.class,
            SignatureNotFromUserException.class,
            OrganizationAccessDeniedException.class
    })
    public ResponseEntity<ErrorDto> handleForbidden(RuntimeException ex, HttpServletRequest req) {
        return respond(HttpStatus.FORBIDDEN, ex, req);
    }

    @ExceptionHandler(DisabledException.class)
    public ResponseEntity<ErrorDto> handleDisabled(DisabledException ex, HttpServletRequest req) {
        return respond(HttpStatus.FORBIDDEN, ex, req);
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ErrorDto> handleBadCredentials(BadCredentialsException ex, HttpServletRequest req) {
        return respond(HttpStatus.UNAUTHORIZED, ex, req);
    }

    // ---- 400 BAD REQUEST ----

    @ExceptionHandler({
            InvalidSignatureSchemaException.class,
            IllegalArgumentException.class
    })
    public ResponseEntity<ErrorDto> handleBadRequest(RuntimeException ex, HttpServletRequest req) {
        return respond(HttpStatus.BAD_REQUEST, ex, req);
    }

    // ---- 412 PRECONDITION FAILED ----

    @ExceptionHandler(SignatureNotSemVerException.class)
    public ResponseEntity<ErrorDto> handlePreconditionFailed(SignatureNotSemVerException ex, HttpServletRequest req) {
        return respond(HttpStatus.PRECONDITION_FAILED, ex, req);
    }

    // ---- Analyzer (dynamic status) ----

    @ExceptionHandler(AnalyzerServiceException.class)
    public ResponseEntity<ErrorDto> handleAnalyzer(AnalyzerServiceException ex, HttpServletRequest req) {
        HttpStatus status = ex.getStatus() > 0 ? HttpStatus.valueOf(ex.getStatus()) : HttpStatus.BAD_GATEWAY;
        String message = (ex.getDetail() == null || ex.getDetail().isBlank()) ? "Analyzer Error" : ex.getDetail();
        return ResponseEntity.status(status)
                .body(new ErrorDto(Instant.now(), status.value(), message, req.getRequestURI()));
    }

    @ExceptionHandler(OpsAgentException.class)
    public ResponseEntity<ErrorDto> handleOpsAgent(OpsAgentException ex, HttpServletRequest req) {
        HttpStatus status = ex.getStatus() > 0 ? HttpStatus.valueOf(ex.getStatus()) : HttpStatus.BAD_GATEWAY;
        return ResponseEntity.status(status)
                .body(new ErrorDto(Instant.now(), status.value(), ex.getMessage(), req.getRequestURI()));
    }

    // ---- Validation (@Valid) ----

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorDto> handleValidation(MethodArgumentNotValidException ex, HttpServletRequest req) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(fe -> fe.getField() + ": " + fe.getDefaultMessage())
                .collect(Collectors.joining("; "));
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ErrorDto.of(HttpStatus.BAD_REQUEST.value(), message, req.getRequestURI()));
    }

    // ---- helper ----

    private ResponseEntity<ErrorDto> respond(HttpStatus status, RuntimeException ex, HttpServletRequest req) {
        return ResponseEntity.status(status)
                .body(ErrorDto.of(status.value(), ex.getMessage(), req.getRequestURI()));
    }
}

