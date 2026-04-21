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
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import dev.ulloasp.mlsuite.prediction.dtos.CreateTargetParams;
import dev.ulloasp.mlsuite.prediction.dtos.TargetDto;
import dev.ulloasp.mlsuite.prediction.dtos.UpdateTargetParams;
import dev.ulloasp.mlsuite.prediction.entities.Target;
import dev.ulloasp.mlsuite.prediction.exceptions.TargetDoesNotExistsException;
import dev.ulloasp.mlsuite.prediction.services.TargetService;
import dev.ulloasp.mlsuite.security.identity.CurrentUserResolver;
import dev.ulloasp.mlsuite.util.ErrorDto;
import jakarta.servlet.http.HttpServletRequest;

@RestController
public class TargetControllerImpl implements TargetController {

    private final CurrentUserResolver currentUserResolver;
    private final TargetService targetService;

    public TargetControllerImpl(CurrentUserResolver currentUserResolver, TargetService targetService) {
        this.currentUserResolver = currentUserResolver;
        this.targetService = targetService;
    }

    @Override
    public ResponseEntity<TargetDto> createTarget(OAuth2AuthenticationToken authentication,
            @RequestBody CreateTargetParams params) {
        Target target = targetService.createTarget(currentUserResolver.resolve(authentication).userId(),
                params.getPredictionId(),
                params.getOrder(), params.getValue());

        return ResponseEntity.status(HttpStatus.CREATED).body(TargetDto.toDto(target));
    }

    @Override
    public ResponseEntity<TargetDto> updateTarget(OAuth2AuthenticationToken authentication,
            @RequestBody UpdateTargetParams params) {
        Target updatedTarget = targetService.updateTarget(currentUserResolver.resolve(authentication).userId(), params.getTargetId(),
                params.getRealValue());

        return ResponseEntity.status(HttpStatus.CREATED).body(TargetDto.toDto(updatedTarget));
    }

    @Override
    public ResponseEntity<List<TargetDto>> getAllTargets(OAuth2AuthenticationToken authentication,
            @RequestParam Long predictionId) {
        List<Target> targets = targetService.getTargetsByPredictionId(
                currentUserResolver.resolve(authentication).userId(),
                predictionId);

        return ResponseEntity.ok(TargetDto.toDtoList(targets));
    }

    @ExceptionHandler(TargetDoesNotExistsException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ResponseEntity<ErrorDto> handlePredictionDoesNotExistsException(TargetDoesNotExistsException e,
            HttpServletRequest req) {
        ErrorDto dto = ErrorDto.of(HttpStatus.NOT_FOUND.value(), e.getMessage(), req.getRequestURI());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(dto);
    }

}
