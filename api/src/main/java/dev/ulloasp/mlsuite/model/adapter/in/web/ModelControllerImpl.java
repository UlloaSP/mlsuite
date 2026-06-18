/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.model.adapter.in.web;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import dev.ulloasp.mlsuite.model.application.dto.CreateModelDto;
import dev.ulloasp.mlsuite.model.application.dto.ModelDto;
import dev.ulloasp.mlsuite.model.application.port.in.ModelCatalogUseCase;
import dev.ulloasp.mlsuite.model.application.service.ModelCreationService;
import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import dev.ulloasp.mlsuite.security.identity.CurrentUserResolver;
import jakarta.annotation.Nullable;

@RestController
public class ModelControllerImpl implements ModelController {

    private final CurrentUserResolver currentUserResolver;
    private final ModelCatalogUseCase modelCatalogUseCase;
    private final ModelCreationService modelCreationService;

    public ModelControllerImpl(
            CurrentUserResolver currentUserResolver,
            ModelCatalogUseCase modelCatalogUseCase,
            ModelCreationService modelCreationService) {
        this.currentUserResolver = currentUserResolver;
        this.modelCatalogUseCase = modelCatalogUseCase;
        this.modelCreationService = modelCreationService;
    }

    @Override
    public ResponseEntity<CreateModelDto> createModel(
            Authentication authentication,
            @RequestParam String name,
            @RequestParam MultipartFile modelFile,
            @RequestParam @Nullable MultipartFile dataframeFile,
            @RequestParam(defaultValue = "__") String oneHotSeparator) {
        CurrentUser currentUser = currentUserResolver.resolve(authentication);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(modelCreationService.create(
                        currentUser.userId(),
                        name,
                        modelFile,
                        dataframeFile,
                        oneHotSeparator));
    }

    @Override
    public ResponseEntity<List<ModelDto>> getAllModels(Authentication authentication) {
        List<Model> models = modelCatalogUseCase.getModels(currentUserResolver.resolve(authentication).userId());
        return ResponseEntity.ok(ModelDto.toDtoList(models));
    }
}

