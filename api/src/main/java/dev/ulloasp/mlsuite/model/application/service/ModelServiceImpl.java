/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.model.application.service;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.model.application.dto.ModelPageDto;
import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.model.domain.exception.AnalyzerServiceException;
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
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;
import jakarta.transaction.Transactional;

@Service
@Transactional
public class ModelServiceImpl implements ModelService {

    @Autowired
    private RestTemplate restTemplate;
    private final UserLookupService userLookupService;
    private final ModelRepository modelRepository;
    private final ObjectStorageService objectStorageService;
    private final SchemaModelBindingRepository bindingRepository;
    private final PredictionResultRepository resultRepository;
    private final WorkspaceAccessService workspaceAccessService;
    private final WorkspaceAuthorizationService workspaceAuthorizationService;
    private final ModelCatalogReader catalogReader;
    private final ModelArtifactWriter artifactWriter;
    private final ModelArtifactContentReader artifactReader;
    private final StorageDeletionQueue deletionQueue;

    @Value("${analyzer.url}")
    private String analyzerUrl;
    @Value("${model.mutations.require-version:false}")
    private boolean requireMutationVersion;

    public ModelServiceImpl(
            UserLookupService userLookupService,
            ModelRepository modelRepository,
            ObjectStorageService objectStorageService,
            SchemaModelBindingRepository bindingRepository,
            PredictionResultRepository resultRepository,
            WorkspaceAccessService workspaceAccessService,
            WorkspaceAuthorizationService workspaceAuthorizationService,
            ModelArtifactWriter artifactWriter,
            ModelArtifactContentReader artifactReader,
            StorageDeletionQueue deletionQueue) {
        this.userLookupService = userLookupService;
        this.modelRepository = modelRepository;
        this.objectStorageService = objectStorageService;
        this.bindingRepository = bindingRepository;
        this.resultRepository = resultRepository;
        this.workspaceAccessService = workspaceAccessService;
        this.workspaceAuthorizationService = workspaceAuthorizationService;
        this.artifactWriter = artifactWriter;
        this.artifactReader = artifactReader;
        this.deletionQueue = deletionQueue;
        this.catalogReader = new ModelCatalogReader(modelRepository, workspaceAccessService, workspaceAuthorizationService);
    }

    @Override
    public Model createModel(Long userId, String name, MultipartFile modelFile) {
        User user = userLookupService.requireById(userId);
        Organization organization = workspaceAccessService.requireCurrentOrganization(userId);
        workspaceAuthorizationService.requireOrganizationOperate(userId, organization.getId());

        if (modelRepository.existsByNameAndOrganizationId(name, organization.getId())) {
            throw new ModelAlreadyExistsException(name, organization.getName());
        }

        MultipartFile reusableModelFile = modelFile instanceof BufferedMultipartFile
                ? modelFile
                : BufferedMultipartFile.from(modelFile);

        LinkedMultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("model_file", reusableModelFile.getResource());

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);
        Map<String, Object> response;
        try {
            Object responseObj = restTemplate.postForObject(
                    analyzerUrl + "/metadata",
                    requestEntity,
                    Map.class);

            response = (Map<String, Object>) responseObj;
        } catch (RestClientResponseException ex) {
            // FastAPI returned 4xx/5xx (e.g., unsupported model artifact).
            throw AnalyzerServiceException.fromRestClient(ex, analyzerUrl + "/metadata");
        } catch (ResourceAccessException ex) {
            // Network/unavailable
            throw AnalyzerServiceException.fromNetwork(ex, analyzerUrl + "/metadata");
        }
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
    public ModelPageDto getModelPage(Long userId, int page, int size, String search, String sort, String status) {
        return catalogReader.getModelPage(userId, page, size, search, sort, status);
    }

    @Override
    public Model renameModel(Long userId, Long modelId, String name, Long expectedVersion) {
        Organization organization = workspaceAccessService.requireCurrentOrganization(userId);
        requireEdit(userId, organization.getId());
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
        Organization organization = workspaceAccessService.requireCurrentOrganization(userId);
        requireEdit(userId, organization.getId());
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
        Organization organization = workspaceAccessService.requireCurrentOrganization(userId);
        requireCreate(userId, organization.getId());
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
        Organization organization = workspaceAccessService.requireCurrentOrganization(userId);
        requireDelete(userId, organization.getId());
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

    private void requireCreate(Long userId, Long organizationId) {
        if (!workspaceAuthorizationService.workspacePermissions(userId, organizationId).canCreateModels()) {
            throw new dev.ulloasp.mlsuite.organization.domain.exception.OrganizationAccessDeniedException(organizationId);
        }
    }

    private void requireEdit(Long userId, Long organizationId) {
        if (!workspaceAuthorizationService.workspacePermissions(userId, organizationId).canEditModels()) {
            throw new dev.ulloasp.mlsuite.organization.domain.exception.OrganizationAccessDeniedException(organizationId);
        }
    }

    private void requireDelete(Long userId, Long organizationId) {
        if (!workspaceAuthorizationService.workspacePermissions(userId, organizationId).canDeleteModels()) {
            throw new dev.ulloasp.mlsuite.organization.domain.exception.OrganizationAccessDeniedException(organizationId);
        }
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
            objectStorageService.delete(model.getStorageBucket(), model.getStorageObjectKey());
        } catch (RuntimeException cleanupFailure) {
            original.addSuppressed(cleanupFailure);
        }
    }

}
