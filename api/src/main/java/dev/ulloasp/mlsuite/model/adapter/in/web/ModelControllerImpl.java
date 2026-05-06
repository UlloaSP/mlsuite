/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.model.adapter.in.web;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import dev.ulloasp.mlsuite.model.application.dto.CreateModelDto;
import dev.ulloasp.mlsuite.model.application.dto.ModelDto;
import dev.ulloasp.mlsuite.model.application.port.in.AnalyzerUseCase;
import dev.ulloasp.mlsuite.model.application.port.in.ModelCatalogUseCase;
import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import dev.ulloasp.mlsuite.security.identity.CurrentUserResolver;
import dev.ulloasp.mlsuite.signature.application.port.in.SignatureCatalogUseCase;
import dev.ulloasp.mlsuite.signature.domain.model.Signature;
import jakarta.annotation.Nullable;

@RestController
public class ModelControllerImpl implements ModelController {

    private final CurrentUserResolver currentUserResolver;
    private final ModelCatalogUseCase modelCatalogUseCase;
    private final SignatureCatalogUseCase signatureCatalogUseCase;
    private final AnalyzerUseCase analyzerUseCase;

    public ModelControllerImpl(
            CurrentUserResolver currentUserResolver,
            ModelCatalogUseCase modelCatalogUseCase,
            SignatureCatalogUseCase signatureCatalogUseCase,
            AnalyzerUseCase analyzerUseCase) {
        this.currentUserResolver = currentUserResolver;
        this.modelCatalogUseCase = modelCatalogUseCase;
        this.signatureCatalogUseCase = signatureCatalogUseCase;
        this.analyzerUseCase = analyzerUseCase;
    }

    @Override
    public ResponseEntity<CreateModelDto> createModel(
            Authentication authentication,
            @RequestParam String name,
            @RequestParam MultipartFile modelFile,
            @RequestParam @Nullable MultipartFile dataframeFile) {
        CurrentUser currentUser = currentUserResolver.resolve(authentication);
        Model model = modelCatalogUseCase.createModel(currentUser.userId(), name, modelFile);
        Map<String, Object> schemaFromModel = analyzerUseCase.generateInputSignature(currentUser.userId(), modelFile, null);
        Signature signatureFromModel = signatureCatalogUseCase.createSignature(
                currentUser.userId(),
                model.getId(),
                schemaFromModel,
                "Model",
                0,
                0,
                0,
                null);

        Signature signatureFromDataframe = null;
        if (dataframeFile != null) {
            Map<String, Object> schemaFromDataframe = analyzerUseCase.generateInputSignature(
                    currentUser.userId(),
                    modelFile,
                    dataframeFile);
            signatureFromDataframe = signatureCatalogUseCase.createSignature(
                    currentUser.userId(),
                    model.getId(),
                    schemaFromDataframe,
                    "Dataframe",
                    0,
                    0,
                    1,
                    signatureFromModel.getId());
        }

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(CreateModelDto.toDto(model, signatureFromModel, signatureFromDataframe));
    }

    @Override
    public ResponseEntity<List<ModelDto>> getAllModels(Authentication authentication) {
        List<Model> models = modelCatalogUseCase.getModels(currentUserResolver.resolve(authentication).userId());
        return ResponseEntity.ok(ModelDto.toDtoList(models));
    }
}

