/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.model.application.service;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
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

import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.model.domain.exception.AnalyzerServiceException;
import dev.ulloasp.mlsuite.model.domain.exception.ModelAlreadyExistsException;
import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.ModelRepository;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
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
    private final WorkspaceAccessService workspaceAccessService;
    private final WorkspaceAuthorizationService workspaceAuthorizationService;

    @Value("${analyzer.url}")
    private String analyzerUrl;

    public ModelServiceImpl(
            UserLookupService userLookupService,
            ModelRepository modelRepository,
            ObjectStorageService objectStorageService,
            WorkspaceAccessService workspaceAccessService,
            WorkspaceAuthorizationService workspaceAuthorizationService) {
        this.userLookupService = userLookupService;
        this.modelRepository = modelRepository;
        this.objectStorageService = objectStorageService;
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

        LinkedMultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("model_file", modelFile.getResource());

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
            // FastAPI returned 4xx/5xx (e.g., HTTPException(400, "Not a sklearn
            // estimator."))
            throw AnalyzerServiceException.fromRestClient(ex, analyzerUrl + "/metadata");
        } catch (ResourceAccessException ex) {
            // Network/unavailable
            throw AnalyzerServiceException.fromNetwork(ex, analyzerUrl + "/metadata");
        }
        String type = response.get("type") != null ? response.get("type").toString() : null;
        String specificType = response.get("specificType") != null ? response.get("specificType").toString() : null;
        String fileName = response.get("fileName") != null
                ? response.get("fileName").toString()
                : modelFile.getOriginalFilename();
        String objectKey = buildObjectKey(organization.getId(), name, fileName);
        StoredObject storedObject;
        try {
            storedObject = objectStorageService.store(
                    objectKey,
                    fileName,
                    modelFile.getContentType(),
                    modelFile.getInputStream(),
                    modelFile.getSize());
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
        return modelRepository.findByOrganizationId(organizationId);
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

}

