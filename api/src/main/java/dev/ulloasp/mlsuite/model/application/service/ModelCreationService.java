/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.model.application.service;

import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import dev.ulloasp.mlsuite.model.application.dto.CreateModelDto;
import dev.ulloasp.mlsuite.model.application.port.in.AnalyzerUseCase;
import dev.ulloasp.mlsuite.model.application.port.in.ModelCatalogUseCase;
import dev.ulloasp.mlsuite.model.application.upload.BufferedMultipartFile;
import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.storage.ObjectStorageService;
import jakarta.annotation.Nullable;
import jakarta.transaction.Transactional;

@Service
public class ModelCreationService {

    private final ModelCatalogUseCase modelCatalogUseCase;
    private final AnalyzerUseCase analyzerUseCase;
    private final ObjectStorageService objectStorageService;

    public ModelCreationService(
            ModelCatalogUseCase modelCatalogUseCase,
            AnalyzerUseCase analyzerUseCase,
            ObjectStorageService objectStorageService) {
        this.modelCatalogUseCase = modelCatalogUseCase;
        this.analyzerUseCase = analyzerUseCase;
        this.objectStorageService = objectStorageService;
    }

    @Transactional
    public CreateModelDto create(
            Long userId,
            String name,
            MultipartFile modelFile,
            @Nullable MultipartFile dataframeFile) {
        MultipartFile reusableModelFile = BufferedMultipartFile.from(modelFile);
        MultipartFile reusableDataframeFile = dataframeFile != null
                ? BufferedMultipartFile.from(dataframeFile)
                : null;
        Model model = null;
        try {
            model = modelCatalogUseCase.createModel(userId, name, reusableModelFile);
            model.setInputSchema(analyzerUseCase.generateInputSchema(userId, reusableModelFile,
                    reusableDataframeFile));
            return CreateModelDto.toDto(model);
        } catch (RuntimeException ex) {
            deleteStoredObject(model, ex);
            throw ex;
        }
    }

    private void deleteStoredObject(@Nullable Model model, RuntimeException original) {
        if (model == null || !model.hasStoredObject()) {
            return;
        }
        try {
            objectStorageService.delete(model.getStorageBucket(), model.getStorageObjectKey());
        } catch (RuntimeException cleanupFailure) {
            original.addSuppressed(cleanupFailure);
        }
    }
}
