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

import dev.ulloasp.mlsuite.prediction.application.dto.CreateTargetParams;
import dev.ulloasp.mlsuite.prediction.application.dto.TargetDto;
import dev.ulloasp.mlsuite.prediction.application.dto.UpdateTargetParams;
import dev.ulloasp.mlsuite.prediction.application.port.in.TargetCatalogUseCase;
import dev.ulloasp.mlsuite.prediction.domain.model.Target;
import dev.ulloasp.mlsuite.security.identity.CurrentUserResolver;
import jakarta.validation.Valid;

@RestController
public class TargetControllerImpl implements TargetController {

    private final CurrentUserResolver currentUserResolver;
    private final TargetCatalogUseCase targetCatalogUseCase;

    public TargetControllerImpl(CurrentUserResolver currentUserResolver, TargetCatalogUseCase targetCatalogUseCase) {
        this.currentUserResolver = currentUserResolver;
        this.targetCatalogUseCase = targetCatalogUseCase;
    }

    @Override
    public ResponseEntity<TargetDto> createTarget(
            Authentication authentication,
            @Valid @RequestBody CreateTargetParams params) {
        Target target = targetCatalogUseCase.createTarget(
                currentUserResolver.resolve(authentication).userId(),
                params.predictionId(),
                params.order(),
                params.value());
        return ResponseEntity.status(HttpStatus.CREATED).body(TargetDto.toDto(target));
    }

    @Override
    public ResponseEntity<TargetDto> updateTarget(
            Authentication authentication,
            @Valid @RequestBody UpdateTargetParams params) {
        Target updatedTarget = targetCatalogUseCase.updateTarget(
                currentUserResolver.resolve(authentication).userId(),
                params.targetId(),
                params.realValue());
        return ResponseEntity.status(HttpStatus.CREATED).body(TargetDto.toDto(updatedTarget));
    }

    @Override
    public ResponseEntity<List<TargetDto>> getAllTargets(
            Authentication authentication,
            @RequestParam Long predictionId) {
        List<Target> targets = targetCatalogUseCase.getTargetsByPredictionId(
                currentUserResolver.resolve(authentication).userId(),
                predictionId);
        return ResponseEntity.ok(TargetDto.toDtoList(targets));
    }
}

