/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.model.application.service;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
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

import dev.ulloasp.mlsuite.model.application.dto.ModelDto;
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
import dev.ulloasp.mlsuite.storage.StoredObject;
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

    @Value("${analyzer.url}")
    private String analyzerUrl;

    public ModelServiceImpl(
            UserLookupService userLookupService,
            ModelRepository modelRepository,
            ObjectStorageService objectStorageService,
            SchemaModelBindingRepository bindingRepository,
            PredictionResultRepository resultRepository,
            WorkspaceAccessService workspaceAccessService,
            WorkspaceAuthorizationService workspaceAuthorizationService) {
        this.userLookupService = userLookupService;
        this.modelRepository = modelRepository;
        this.objectStorageService = objectStorageService;
        this.bindingRepository = bindingRepository;
        this.resultRepository = resultRepository;
        this.workspaceAccessService = workspaceAccessService;
        this.workspaceAuthorizationService = workspaceAuthorizationService;
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
        String objectKey = buildObjectKey(organization.getId(), name, fileName);
        StoredObject storedObject;
        try {
            storedObject = objectStorageService.store(
                    objectKey,
                    fileName,
                    reusableModelFile.getContentType(),
                    reusableModelFile.getInputStream(),
                    reusableModelFile.getSize());
        } catch (Exception ex) {
            throw new IllegalArgumentException("Model file is empty or invalid", ex);
        }

        Model model = new Model();
        model.setUser(user);
        model.setOrganization(organization);
        model.setName(name);
        model.setType(type);
        model.setSpecificType(specificType);
        model.setFileName(fileName);
        model.setModelFile(new byte[0]);
        model.setStorageBucket(storedObject.bucket());
        model.setStorageObjectKey(storedObject.objectKey());
        model.setStorageEtag(storedObject.etag());
        model.setModelSizeBytes(storedObject.sizeBytes());

        try {
            return modelRepository.save(model);
        } catch (RuntimeException ex) {
            objectStorageService.delete(storedObject.bucket(), storedObject.objectKey());
            throw ex;
        }
    }

    @Override
    public List<Model> getModels(Long userId) {
        Long organizationId = workspaceAccessService.requireCurrentOrganization(userId).getId();
        workspaceAuthorizationService.requireOrganizationRead(userId, organizationId);
        return modelRepository.findByOrganizationIdAndArchivedAtIsNull(organizationId);
    }

    @Override
    public ModelPageDto getModelPage(Long userId, int page, int size, String search, String sort, String status) {
        Long organizationId = workspaceAccessService.requireCurrentOrganization(userId).getId();
        workspaceAuthorizationService.requireOrganizationRead(userId, organizationId);
        Page<Model> models = modelRepository.findCatalogPage(
                organizationId,
                normalizeSearch(search),
                "all".equals(status) || "archived".equals(status),
                "archived".equals(status),
                PageRequest.of(Math.max(page, 0), normalizePageSize(size), sort(sort)));
        return new ModelPageDto(
                ModelDto.toDtoList(models.getContent()),
                models.getNumber(),
                models.getSize(),
                models.getTotalElements(),
                models.hasNext());
    }

    @Override
    public Model renameModel(Long userId, Long modelId, String name) {
        Organization organization = workspaceAccessService.requireCurrentOrganization(userId);
        requireEdit(userId, organization.getId());
        Model model = requireModel(userId, organization.getId(), modelId);
        String nextName = normalizeName(name);
        if (modelRepository.existsByNameAndOrganizationIdAndIdNot(nextName, organization.getId(), modelId)) {
            throw new ModelAlreadyExistsException(nextName, organization.getName());
        }
        model.setName(nextName);
        return modelRepository.save(model);
    }

    @Override
    public Model archiveModel(Long userId, Long modelId) {
        Organization organization = workspaceAccessService.requireCurrentOrganization(userId);
        requireEdit(userId, organization.getId());
        Model model = requireModel(userId, organization.getId(), modelId);
        if (model.getArchivedAt() == null) {
            model.setArchivedAt(OffsetDateTime.now(ZoneOffset.UTC));
        }
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

        byte[] bytes = loadModelBytes(source);
        String objectKey = buildObjectKey(organization.getId(), nextName, source.getFileName());
        StoredObject stored = objectStorageService.store(
                objectKey,
                source.getFileName(),
                "application/octet-stream",
                bytes);
        Model copy = copyModel(user, organization, source, nextName, stored);
        try {
            return modelRepository.save(copy);
        } catch (RuntimeException ex) {
            objectStorageService.delete(stored.bucket(), stored.objectKey());
            throw ex;
        }
    }

    @Override
    public void deleteModel(Long userId, Long modelId) {
        Organization organization = workspaceAccessService.requireCurrentOrganization(userId);
        requireDelete(userId, organization.getId());
        Model model = requireModel(userId, organization.getId(), modelId);
        if (bindingRepository.existsByModelId(modelId) || resultRepository.existsByModelId(modelId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Model is used by schemas or prediction runs. Archive it instead.");
        }
        modelRepository.delete(model);
        if (model.hasStoredObject()) {
            objectStorageService.delete(model.getStorageBucket(), model.getStorageObjectKey());
        }
    }

    private String buildObjectKey(Long organizationId, String modelName, String fileName) {
        String safeModelName = sanitizePathSegment(modelName);
        String safeFileName = sanitizePathSegment(fileName != null ? fileName : "model.bin");
        return "organizations/" + organizationId + "/models/" + safeModelName + "/" + UUID.randomUUID() + "/" + safeFileName;
    }

    private String sanitizePathSegment(String value) {
        return value
                .replaceAll("[^a-zA-Z0-9._-]", "_")
                .replaceAll("_+", "_");
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

    private String normalizeSearch(String search) {
        return search == null ? "" : search.strip();
    }

    private int normalizePageSize(int size) {
        if (size <= 0) {
            return 24;
        }
        return Math.min(size, 100);
    }

    private Sort sort(String mode) {
        if ("name".equals(mode)) {
            return Sort.by(Sort.Order.asc("name").ignoreCase(), Sort.Order.desc("updatedAt"));
        }
        if ("algorithm".equals(mode)) {
            return Sort.by(Sort.Order.asc("type").ignoreCase(), Sort.Order.asc("specificType").ignoreCase());
        }
        return Sort.by(Sort.Order.desc("updatedAt"), Sort.Order.asc("name").ignoreCase());
    }

    private byte[] loadModelBytes(Model model) {
        if (model.hasStoredObject()) {
            return objectStorageService.load(model.getStorageBucket(), model.getStorageObjectKey());
        }
        return model.getModelFile();
    }

    private Model copyModel(User user, Organization organization, Model source, String name, StoredObject stored) {
        Model copy = new Model();
        copy.setUser(user);
        copy.setOrganization(organization);
        copy.setName(name);
        copy.setType(source.getType());
        copy.setSpecificType(source.getSpecificType());
        copy.setFileName(source.getFileName());
        copy.setModelFile(new byte[0]);
        copy.setStorageBucket(stored.bucket());
        copy.setStorageObjectKey(stored.objectKey());
        copy.setStorageEtag(stored.etag());
        copy.setModelSizeBytes(stored.sizeBytes());
        copy.setInputSchema(source.getInputSchema());
        return copy;
    }

}

