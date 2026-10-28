/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.model.application.service;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.model.application.dto.ModelDto;
import dev.ulloasp.mlsuite.util.PageDto;
import dev.ulloasp.mlsuite.model.application.port.in.ModelCatalogUseCase;
import dev.ulloasp.mlsuite.model.application.runtime.RuntimeEnvironments;
import dev.ulloasp.mlsuite.model.application.upload.BundleInspection;
import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.model.domain.exception.ModelAlreadyExistsException;
import dev.ulloasp.mlsuite.model.domain.exception.ModelDoesNotExistsException;
import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.ModelRepository;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionResultRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaModelBindingRepository;
import dev.ulloasp.mlsuite.storage.ArtifactHash;
import dev.ulloasp.mlsuite.storage.ArtifactSource;
import dev.ulloasp.mlsuite.storage.ModelArtifactInlineCopy;
import dev.ulloasp.mlsuite.storage.ObjectStorageService;
import dev.ulloasp.mlsuite.storage.StorageProperties;
import dev.ulloasp.mlsuite.storage.ModelArtifactContentReader;
import dev.ulloasp.mlsuite.storage.ModelArtifactReference;
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
    private final ModelArtifactInlineCopy inlineCopy;
    private final boolean retainInlineCopy;
    private final RuntimeEnvironments environments;
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
            ModelArtifactInlineCopy inlineCopy,
            StorageProperties storageProperties,
            RuntimeEnvironments environments,
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
        this.inlineCopy = inlineCopy;
        this.retainInlineCopy = storageProperties.isRetainInlineCopy();
        this.environments = environments;
        this.requireMutationVersion = requireMutationVersion;
        this.catalogReader = new ModelCatalogReader(modelRepository, workspaceAuthorizationService);
    }

    @Override
    public void requireCreatable(Long userId, String name) {
        Organization organization = workspaceAuthorizationService.requireCurrent(userId, PermissionKey.CREATE_MODELS);
        if (modelRepository.existsByNameAndOrganizationId(name, organization.getId())) {
            throw new ModelAlreadyExistsException(name, organization.getName());
        }
    }

    @Override
    public Model createModel(Long userId, String name, BundleInspection inspection, ArtifactSource artifact,
            String sha256, String contentType) {
        User user = userLookupService.requireById(userId);
        Organization organization = workspaceAuthorizationService.requireCurrent(userId, PermissionKey.CREATE_MODELS);
        // Checked again: another upload may have taken the name while the runtime read this one.
        if (modelRepository.existsByNameAndOrganizationId(name, organization.getId())) {
            throw new ModelAlreadyExistsException(name, organization.getName());
        }

        Model model = new Model();
        model.setUser(user);
        model.setUpdatedBy(user);
        model.setOrganization(organization);
        model.setName(name);
        model.setType(inspection.type());
        model.setSpecificType(inspection.specificType());
        model.setFileName(inspection.fileName());
        model.setInputSchema(inspection.schema());
        model.setBundleManifest(inspection.manifest());
        model.setFeatureImportances(inspection.featureImportances());
        model.setEnvironmentKey(environments.register(inspection.environment()));
        model.setRuntimeState(RuntimeEnvironments.initialState(model.getEnvironmentKey()));
        model.setModelFile(new byte[0]);
        model.setModelSizeBytes(artifact.sizeBytes());
        model.setArtifactState(ModelArtifactState.INLINE_ONLY);
        return storeArtifact(model, artifact, sha256, contentType);
    }

    /**
     * Streams the new model's artifact into the object store and, when the inline copy is kept,
     * into its row; the copy is written last, over JDBC, so no later flush of the entity, which
     * holds no artifact, overwrites it.
     */
    private Model storeArtifact(Model model, ArtifactSource artifact, String sha256, String contentType) {
        try {
            modelRepository.saveAndFlush(model);
            artifactWriter.storeAndAttach(model, artifact, sha256, contentType);
            Model stored = modelRepository.saveAndFlush(model);
            if (retainInlineCopy) {
                inlineCopy.write(stored.getId(), artifact, sha256);
            }
            return stored;
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

    /** Returns an archived model to the active catalog, where new schemas may bind it again. */
    @Override
    public Model restoreModel(Long userId, Long modelId, Long expectedVersion) {
        Organization organization = workspaceAuthorizationService.requireCurrent(userId, PermissionKey.EDIT_MODELS);
        Model model = requireModel(userId, organization.getId(), modelId);
        ModelVersionGuard.requireCurrent(model, expectedVersion, requireMutationVersion);
        model.setArchivedAt(null);
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

        ModelArtifactReference reference = ModelArtifactReference.of(source);
        ArtifactSource artifact = artifactReader.source(reference);
        // A model stored before artifacts were hashed gets the hash of its bytes, read once more.
        String sha256 = reference.sha256() != null ? reference.sha256() : ArtifactHash.sha256(artifact);
        Model copy = copyModel(user, organization, source, nextName, artifact.sizeBytes());
        return storeArtifact(copy, artifact, sha256, "application/octet-stream");
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
        environments.releaseWhenUnused(model.getEnvironmentKey());
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

    private Model copyModel(User user, Organization organization, Model source, String name, long sizeBytes) {
        Model copy = new Model();
        copy.setUser(user);
        copy.setUpdatedBy(user);
        copy.setOrganization(organization);
        copy.setName(name);
        copy.setType(source.getType());
        copy.setSpecificType(source.getSpecificType());
        copy.setFileName(source.getFileName());
        copy.setModelFile(new byte[0]);
        copy.setModelSizeBytes(sizeBytes);
        copy.setArtifactState(ModelArtifactState.INLINE_ONLY);
        copy.setInputSchema(source.getInputSchema());
        copy.setBundleManifest(source.getBundleManifest());
        copy.setFeatureImportances(source.getFeatureImportances());
        // The same artifact in the same environment: whatever preparing it found holds for the copy.
        copy.setEnvironmentKey(source.getEnvironmentKey());
        copy.setRuntimeState(source.getRuntimeState());
        copy.setRuntimeError(source.getRuntimeError());
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
