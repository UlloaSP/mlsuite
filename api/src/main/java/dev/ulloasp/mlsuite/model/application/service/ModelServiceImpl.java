/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.model.application.service;

import dev.ulloasp.mlsuite.principal.application.service.Principals;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;

import org.springframework.stereotype.Service;

import dev.ulloasp.mlsuite.audit.application.service.AuditLogService;
import dev.ulloasp.mlsuite.audit.domain.model.AuditAction;
import dev.ulloasp.mlsuite.audit.domain.model.AuditActor;
import dev.ulloasp.mlsuite.audit.domain.model.AuditDetails;
import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.model.application.dto.ModelDto;
import dev.ulloasp.mlsuite.util.PageDto;
import dev.ulloasp.mlsuite.model.application.port.in.ModelCatalogUseCase;
import dev.ulloasp.mlsuite.model.application.runtime.RuntimeEnvironments;
import dev.ulloasp.mlsuite.model.domain.model.ModelRuntimeState;
import dev.ulloasp.mlsuite.model.application.upload.BundleInspection;
import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.model.domain.exception.ModelAlreadyExistsException;
import dev.ulloasp.mlsuite.model.domain.exception.ModelDoesNotExistsException;
import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.ModelRepository;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionResultRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaModelBindingRepository;
import dev.ulloasp.mlsuite.storage.ArtifactSource;
import dev.ulloasp.mlsuite.storage.ObjectStorageService;
import dev.ulloasp.mlsuite.storage.ModelArtifactContentReader;
import dev.ulloasp.mlsuite.storage.ModelArtifactReference;
import dev.ulloasp.mlsuite.storage.ModelArtifactWriter;
import dev.ulloasp.mlsuite.storage.StorageDeletionQueue;
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
    private final RuntimeEnvironments environments;
    private final AuditLogService auditLog;
    private final Principals principals;

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
            RuntimeEnvironments environments,
            AuditLogService auditLog,
            Principals principals) {
        this.userLookupService = userLookupService;
        this.modelRepository = modelRepository;
        this.objectStorageService = objectStorageService;
        this.bindingRepository = bindingRepository;
        this.resultRepository = resultRepository;
        this.workspaceAuthorizationService = workspaceAuthorizationService;
        this.artifactWriter = artifactWriter;
        this.artifactReader = artifactReader;
        this.deletionQueue = deletionQueue;
        this.environments = environments;
        this.auditLog = auditLog;
        this.principals = principals;
        this.catalogReader = new ModelCatalogReader(modelRepository, workspaceAuthorizationService);
    }

    @Override
    public void requireCreatable(Long userId, String name) {
        Organization organization = workspaceAuthorizationService.requireCurrent(userId, PermissionKey.CREATE_MODELS);
        name = normalizeName(name);
        if (modelRepository.existsByNameIgnoreCaseAndOrganizationId(name, organization.getId())) {
            throw new ModelAlreadyExistsException(name, organization.getName());
        }
    }

    @Override
    public Model createModel(Long userId, String name, BundleInspection inspection, ArtifactSource artifact,
            String sha256, String contentType) {
        User user = userLookupService.requireById(userId);
        Organization organization = workspaceAuthorizationService.requireCurrent(userId, PermissionKey.CREATE_MODELS);
        // Another upload may have taken the name while the runtime read this one: uq_model_name_org
        // refuses the row, and storeArtifact removes the object again.
        Model model = new Model();
        model.setCreatedBy(principals.of(user));
        model.setUpdatedBy(model.getCreatedBy());
        model.setOrganization(organization);
        model.setName(normalizeName(name));
        model.setType(inspection.type());
        model.setSpecificType(inspection.specificType());
        model.setFileName(inspection.fileName());
        model.setInputSchema(inspection.schema());
        model.setBundleManifest(inspection.manifest());
        model.setEnvironmentKey(environments.register(inspection.environment()));
        // It runs once its environment is prepared and it has loaded there.
        model.setRuntimeState(ModelRuntimeState.PREPARING);
        Model saved = storeArtifact(model, artifact, sha256, contentType);
        auditLog.record(AuditActor.user(userId), organization.getId(), AuditAction.MODEL_UPLOAD, saved.getId(),
                AuditDetails.of("name", name, "file", saved.getFileName(), "sha256", sha256));
        return saved;
    }

    /**
     * Streams the new model's artifact into the object store, then writes its row, which only
     * exists naming a verified object. The object goes again if the row cannot be written.
     */
    private Model storeArtifact(Model model, ArtifactSource artifact, String sha256, String contentType) {
        artifactWriter.storeAndAttach(model, artifact, sha256, contentType);
        try {
            return modelRepository.saveAndFlush(model);
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
        ModelVersionGuard.requireCurrent(model, expectedVersion);
        String nextName = normalizeName(name);
        auditLog.record(AuditActor.user(userId), organization.getId(), AuditAction.MODEL_RENAME, modelId,
                AuditDetails.of("name", AuditDetails.changed(model.getName(), nextName)));
        model.setName(nextName);
        model.setUpdatedBy(principals.user(userId));
        return modelRepository.save(model);
    }

    @Override
    public Model archiveModel(Long userId, Long modelId, Long expectedVersion) {
        Organization organization = workspaceAuthorizationService.requireCurrent(userId, PermissionKey.EDIT_MODELS);
        Model model = requireModel(userId, organization.getId(), modelId);
        ModelVersionGuard.requireCurrent(model, expectedVersion);
        if (model.getArchivedAt() == null) {
            model.setArchivedAt(OffsetDateTime.now(ZoneOffset.UTC));
            auditLog.record(AuditActor.user(userId), organization.getId(), AuditAction.MODEL_ARCHIVE, modelId,
                    AuditDetails.of("name", model.getName()));
        }
        model.setUpdatedBy(principals.user(userId));
        return modelRepository.save(model);
    }

    /** Returns an archived model to the active catalog, where new schemas may bind it again. */
    @Override
    public Model restoreModel(Long userId, Long modelId, Long expectedVersion) {
        Organization organization = workspaceAuthorizationService.requireCurrent(userId, PermissionKey.EDIT_MODELS);
        Model model = requireModel(userId, organization.getId(), modelId);
        ModelVersionGuard.requireCurrent(model, expectedVersion);
        if (model.getArchivedAt() != null) {
            auditLog.record(AuditActor.user(userId), organization.getId(), AuditAction.MODEL_RESTORE, modelId,
                    AuditDetails.of("name", model.getName()));
        }
        model.setArchivedAt(null);
        model.setUpdatedBy(principals.user(userId));
        return modelRepository.save(model);
    }

    @Override
    public Model duplicateModel(Long userId, Long modelId, String name) {
        User user = userLookupService.requireById(userId);
        Organization organization = workspaceAuthorizationService.requireCurrent(userId, PermissionKey.CREATE_MODELS);
        Model source = requireModel(userId, organization.getId(), modelId);
        String nextName = normalizeName(name);
        ArtifactSource artifact = artifactReader.source(ModelArtifactReference.of(source));
        Model copy = storeArtifact(copyModel(user, organization, source, nextName), artifact,
                source.getArtifactSha256(), "application/octet-stream");
        auditLog.record(AuditActor.user(userId), organization.getId(), AuditAction.MODEL_DUPLICATE, copy.getId(),
                AuditDetails.of("name", nextName, "source", source.getName(), "sourceModelId", modelId));
        return copy;
    }

    @Override
    public void deleteModel(Long userId, Long modelId, Long expectedVersion) {
        Organization organization = workspaceAuthorizationService.requireCurrent(userId, PermissionKey.DELETE_MODELS);
        Model model = requireModel(userId, organization.getId(), modelId);
        ModelVersionGuard.requireCurrent(model, expectedVersion);
        // A model bound by a schema or named by a result is kept by their foreign keys.
        deletionQueue.enqueue(organization.getId(), model.getStorageBucket(), model.getStorageObjectKey(),
                model.getStorageVersionId());
        auditLog.record(AuditActor.user(userId), organization.getId(), AuditAction.MODEL_DELETE, modelId,
                AuditDetails.of("name", model.getName()));
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

    private Model copyModel(User user, Organization organization, Model source, String name) {
        Model copy = new Model();
        copy.setCreatedBy(principals.of(user));
        copy.setUpdatedBy(copy.getCreatedBy());
        copy.setOrganization(organization);
        copy.setName(name);
        copy.setType(source.getType());
        copy.setSpecificType(source.getSpecificType());
        copy.setFileName(source.getFileName());
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
        try {
            objectStorageService.delete(
                    model.getStorageBucket(), model.getStorageObjectKey(), model.getStorageVersionId());
        } catch (RuntimeException cleanupFailure) {
            original.addSuppressed(cleanupFailure);
        }
    }

}
