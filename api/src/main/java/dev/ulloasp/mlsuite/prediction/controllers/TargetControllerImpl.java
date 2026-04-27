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
import dev.ulloasp.mlsuite.rbac.RbacPermissions;
import dev.ulloasp.mlsuite.security.identity.CurrentUser;
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
    public ResponseEntity<TargetDto> createTarget(Authentication authentication,
            @RequestBody CreateTargetParams params) {
        CurrentUser currentUser = currentUserResolver.resolve(authentication);
        require(currentUser, RbacPermissions.FEEDBACK_CREATE);
        Target target = targetService.createTarget(currentUser.userId(),
                currentUser.activeOrganizationId(),
                params.getPredictionId(),
                params.getOrder(), params.getValue());

        return ResponseEntity.status(HttpStatus.CREATED).body(TargetDto.toDto(target));
    }

    @Override
    public ResponseEntity<TargetDto> updateTarget(Authentication authentication,
            @RequestBody UpdateTargetParams params) {
        CurrentUser currentUser = currentUserResolver.resolve(authentication);
        require(currentUser, RbacPermissions.FEEDBACK_UPDATE);
        Target updatedTarget = targetService.updateTarget(
                currentUser.userId(),
                currentUser.activeOrganizationId(),
                params.getTargetId(),
                params.getRealValue());

        return ResponseEntity.status(HttpStatus.CREATED).body(TargetDto.toDto(updatedTarget));
    }

    @Override
    public ResponseEntity<List<TargetDto>> getAllTargets(Authentication authentication,
            @RequestParam Long predictionId) {
        CurrentUser currentUser = currentUserResolver.resolve(authentication);
        require(currentUser, RbacPermissions.FEEDBACK_READ);
        List<Target> targets = targetService.getTargetsByPredictionId(
                currentUser.userId(),
                currentUser.activeOrganizationId(),
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

    private void require(CurrentUser currentUser, String permission) {
        if (!currentUser.permissions().contains(permission)) {
            throw new dev.ulloasp.mlsuite.security.tenant.PermissionDeniedException(permission);
        }
    }

}
