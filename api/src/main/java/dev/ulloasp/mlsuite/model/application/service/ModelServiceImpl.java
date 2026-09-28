/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.model.application.service;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.model.adapter.out.analyzer.AnalyzerClient;
import dev.ulloasp.mlsuite.model.application.dto.ModelDto;
import dev.ulloasp.mlsuite.util.PageDto;
import dev.ulloasp.mlsuite.model.application.port.in.ModelCatalogUseCase;
import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.model.domain.exception.ModelAlreadyExistsException;
import dev.ulloasp.mlsuite.model.domain.exception.ModelDoesNotExistsException;
import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.ModelRepository;
import dev.ulloasp.mlsuite.model.application.upload.BufferedMultipartFile;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionResultRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaModelBindingRepository;
import dev.ulloasp.mlsuite.storage.ObjectStorageService;
import dev.ulloasp.mlsuite.storage.ModelArtifactContentReader;
import dev.ulloasp.mlsuite.storage.ModelArtifactWriter;
import dev.ulloasp.mlsuite.storage.StorageDeletionQueue;
import dev.ulloasp.mlsuite.model.domain.model.ModelArtifactState;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.user.application.service.UserLookupService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;
import jakarta.transaction.Transactional;

@Service
@Transactional
public class ModelServiceImpl implements ModelCatalogUseCase {

    private final UserLookupService userLookupService;
    private final ModelRepository modelRepository;
    private final ObjectStorageService objectStorageService;
    private final SchemaModelBindingRepository bindingRepository;
    private final PredictionResultRepository resultRepository;
    private final WorkspaceAuthorizationService workspaceAuthorizationService;
    private final ModelCatalogReader catalogReader;
    private final ModelArtifactWriter artifactWriter;
    private final ModelArtifactContentReader artifactReader;
    private final StorageDeletionQueue deletionQueue;
    private final AnalyzerClient analyzerClient;
    private final boolean requireMutationVersion;

    public ModelServiceImpl(
            UserLookupService userLookupService,
            ModelRepository modelRepository,
            ObjectStorageService objectStorageService,
            SchemaModelBindingRepository bindingRepository,
            PredictionResultRepository resultRepository,
            WorkspaceAuthorizationService workspaceAuthorizationService,
            ModelArtifactWriter artifactWriter,
            ModelArtifactContentReader artifactReader,
            StorageDeletionQueue deletionQueue,
            AnalyzerClient analyzerClient,
            @Value("${model.mutations.require-version:false}") boolean requireMutationVersion) {
        this.userLookupService = userLookupService;
        this.modelRepository = modelRepository;
        this.objectStorageService = objectStorageService;
        this.bindingRepository = bindingRepository;
        this.resultRepository = resultRepository;
        this.workspaceAuthorizationService = workspaceAuthorizationService;
        this.artifactWriter = artifactWriter;
        this.artifactReader = artifactReader;
        this.deletionQueue = deletionQueue;
        this.analyzerClient = analyzerClient;
        this.requireMutationVersion = requireMutationVersion;
        this.catalogReader = new ModelCatalogReader(modelRepository, workspaceAuthorizationService);
    }

    @Override
    public Model createModel(Long userId, String name, MultipartFile modelFile) {
        User user = userLookupService.requireById(userId);
        Organization organization = workspaceAuthorizationService.requireCurrent(userId, PermissionKey.CREATE_MODELS);

        if (modelRepository.existsByNameAndOrganizationId(name, organization.getId())) {
            throw new ModelAlreadyExistsException(name, organization.getName());
        }

        MultipartFile reusableModelFile = modelFile instanceof BufferedMultipartFile
                ? modelFile
                : BufferedMultipartFile.from(modelFile);

        LinkedMultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("model_file", reusableModelFile.getResource());
        Map<String, Object> response = analyzerClient.post("/metadata", body);
        String type = response.get("type") != null ? response.get("type").toString() : null;
        String specificType = response.get("specificType") != null ? response.get("specificType").toString() : null;
        String fileName = response.get("fileName") != null
                ? response.get("fileName").toString()
                : reusableModelFile.getOriginalFilename();
        byte[] artifactBytes;
        try {
            artifactBytes = reusableModelFile.getBytes();
        } catch (Exception ex) {
            throw new IllegalArgumentException("Model file is empty or invalid", ex);
        }

        Model model = new Model();
        model.setUser(user);
        model.setUpdatedBy(user);
        model.setOrganization(organization);
        model.setName(name);
        model.setType(type);
        model.setSpecificType(specificType);
        model.setFileName(fileName);
        model.setModelFile(artifactBytes);
        model.setModelSizeBytes((long) artifactBytes.length);
        model.setArtifactState(ModelArtifactState.INLINE_ONLY);

        try {
            modelRepository.saveAndFlush(model);
            artifactWriter.storeAndAttach(model, artifactBytes, reusableModelFile.getContentType());
            return modelRepository.save(model);
        } catch (RuntimeException ex) {
            deleteStoredObject(model, ex);
            throw ex;
        }
    }

    @Override
    public List<Model> getModels(Long userId) {
        return catalogReader.getModels(userId);
    }

    @Override
    public Model getModel(Long userId, Long modelId) {
        return catalogReader.findModel(userId, modelId)
                .orElseThrow(() -> new ModelDoesNotExistsException(modelId, userLookupService.requireById(userId).getUsername()));
    }

    @Override
    public PageDto<ModelDto> getModelPage(Long userId, int page, int size, String search, String sort, String status) {
        return catalogReader.getModelPage(userId, page, size, search, sort, status);
    }

    @Override
    public Model renameModel(Long userId, Long modelId, String name, Long expectedVersion) {
        Organization organization = workspaceAuthorizationService.requireCurrent(userId, PermissionKey.EDIT_MODELS);
        Model model = requireModel(userId, organization.getId(), modelId);
        ModelVersionGuard.requireCurrent(model, expectedVersion, requireMutationVersion);
        String nextName = normalizeName(name);
        if (modelRepository.existsByNameAndOrganizationIdAndIdNot(nextName, organization.getId(), modelId)) {
            throw new ModelAlreadyExistsException(nextName, organization.getName());
        }
        model.setName(nextName);
        model.setUpdatedBy(userLookupService.requireById(userId));
        return modelRepository.save(model);
    }

    @Override
    public Model archiveModel(Long userId, Long modelId, Long expectedVersion) {
        Organization organization = workspaceAuthorizationService.requireCurrent(userId, PermissionKey.EDIT_MODELS);
        Model model = requireModel(userId, organization.getId(), modelId);
        ModelVersionGuard.requireCurrent(model, expectedVersion, requireMutationVersion);
        if (model.getArchivedAt() == null) {
            model.setArchivedAt(OffsetDateTime.now(ZoneOffset.UTC));
        }
        model.setUpdatedBy(userLookupService.requireById(userId));
        return modelRepository.save(model);
    }

    @Override
    public Model duplicateModel(Long userId, Long modelId, String name) {
        User user = userLookupService.requireById(userId);
        Organization organization = workspaceAuthorizationService.requireCurrent(userId, PermissionKey.CREATE_MODELS);
        Model source = requireModel(userId, organization.getId(), modelId);
        String nextName = normalizeName(name);
        if (modelRepository.existsByNameAndOrganizationId(nextName, organization.getId())) {
            throw new ModelAlreadyExistsException(nextName, organization.getName());
        }

        byte[] bytes = artifactReader.loadVerified(source);
        Model copy = copyModel(user, organization, source, nextName, bytes);
        try {
            modelRepository.saveAndFlush(copy);
            artifactWriter.storeAndAttach(copy, bytes, "application/octet-stream");
            return modelRepository.save(copy);
        } catch (RuntimeException ex) {
            deleteStoredObject(copy, ex);
            throw ex;
        }
    }

    @Override
    public void deleteModel(Long userId, Long modelId, Long expectedVersion) {
        Organization organization = workspaceAuthorizationService.requireCurrent(userId, PermissionKey.DELETE_MODELS);
        Model model = requireModel(userId, organization.getId(), modelId);
        ModelVersionGuard.requireCurrent(model, expectedVersion, requireMutationVersion);
        if (bindingRepository.existsByModelId(modelId) || resultRepository.existsByModelId(modelId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Model is used by schemas or prediction runs. Archive it instead.");
        }
        if (model.hasStoredObject()) {
            deletionQueue.enqueue(model.getStorageBucket(), model.getStorageObjectKey(), model.getStorageVersionId());
        }
        modelRepository.delete(model);
    }

    private Model requireModel(Long userId, Long organizationId, Long modelId) {
        return modelRepository.findByIdAndOrganizationId(modelId, organizationId)
                .orElseThrow(() -> new ModelDoesNotExistsException(modelId, userLookupService.requireById(userId).getUsername()));
    }

    private String normalizeName(String name) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Model name is required.");
        }
        return name.strip();
    }

    private Model copyModel(User user, Organization organization, Model source, String name, byte[] bytes) {
        Model copy = new Model();
        copy.setUser(user);
        copy.setUpdatedBy(user);
        copy.setOrganization(organization);
        copy.setName(name);
        copy.setType(source.getType());
        copy.setSpecificType(source.getSpecificType());
        copy.setFileName(source.getFileName());
        copy.setModelFile(bytes);
        copy.setModelSizeBytes((long) bytes.length);
        copy.setArtifactState(ModelArtifactState.INLINE_ONLY);
        copy.setInputSchema(source.getInputSchema());
        return copy;
    }

    private void deleteStoredObject(Model model, RuntimeException original) {
        if (!model.hasStoredObject()) {
            return;
        }
        try {
            objectStorageService.delete(
                    model.getStorageBucket(), model.getStorageObjectKey(), model.getStorageVersionId());
        } catch (RuntimeException cleanupFailure) {
            original.addSuppressed(cleanupFailure);
        }
    }

}
