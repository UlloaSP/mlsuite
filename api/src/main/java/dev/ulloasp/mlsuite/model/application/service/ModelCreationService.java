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
import dev.ulloasp.mlsuite.signature.application.port.in.SignatureCatalogUseCase;
import dev.ulloasp.mlsuite.signature.domain.model.Signature;
import dev.ulloasp.mlsuite.storage.ObjectStorageService;
import jakarta.annotation.Nullable;
import jakarta.transaction.Transactional;

@Service
public class ModelCreationService {

    private final ModelCatalogUseCase modelCatalogUseCase;
    private final SignatureCatalogUseCase signatureCatalogUseCase;
    private final AnalyzerUseCase analyzerUseCase;
    private final ObjectStorageService objectStorageService;

    public ModelCreationService(
            ModelCatalogUseCase modelCatalogUseCase,
            SignatureCatalogUseCase signatureCatalogUseCase,
            AnalyzerUseCase analyzerUseCase,
            ObjectStorageService objectStorageService) {
        this.modelCatalogUseCase = modelCatalogUseCase;
        this.signatureCatalogUseCase = signatureCatalogUseCase;
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
            Map<String, Object> schemaFromModel = analyzerUseCase.generateInputSignature(userId, reusableModelFile, null);
            Signature signatureFromModel = signatureCatalogUseCase.createSignature(
                    userId,
                    model.getId(),
                    schemaFromModel,
                    "Model",
                    0,
                    0,
                    0,
                    null);
            Signature signatureFromDataframe = createDataframeSignature(
                    userId,
                    model,
                    reusableModelFile,
                    reusableDataframeFile,
                    signatureFromModel);
            return CreateModelDto.toDto(model, signatureFromModel, signatureFromDataframe);
        } catch (RuntimeException ex) {
            deleteStoredObject(model, ex);
            throw ex;
        }
    }

    @Nullable
    private Signature createDataframeSignature(
            Long userId,
            Model model,
            MultipartFile reusableModelFile,
            @Nullable MultipartFile reusableDataframeFile,
            Signature signatureFromModel) {
        if (reusableDataframeFile == null) {
            return null;
        }
        Map<String, Object> schemaFromDataframe = analyzerUseCase.generateInputSignature(
                userId,
                reusableModelFile,
                reusableDataframeFile);
        return signatureCatalogUseCase.createSignature(
                userId,
                model.getId(),
                schemaFromDataframe,
                "Dataframe",
                0,
                0,
                1,
                signatureFromModel.getId());
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
