/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.model.services;

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

import dev.ulloasp.mlsuite.model.entities.Model;
import dev.ulloasp.mlsuite.model.exceptions.AnalyzerServiceException;
import dev.ulloasp.mlsuite.model.exceptions.ModelAlreadyExistsException;
import dev.ulloasp.mlsuite.model.repositories.ModelRepository;
import dev.ulloasp.mlsuite.organization.entities.Organization;
import dev.ulloasp.mlsuite.organization.repositories.OrganizationRepository;
import dev.ulloasp.mlsuite.storage.ObjectStorageService;
import dev.ulloasp.mlsuite.storage.StoredObject;
import dev.ulloasp.mlsuite.user.entity.User;
import dev.ulloasp.mlsuite.user.service.UserLookupService;
import jakarta.transaction.Transactional;

@Service
@Transactional
public class ModelServiceImpl implements ModelService {

    @Autowired
    private RestTemplate restTemplate;
    private final UserLookupService userLookupService;
    private final ModelRepository modelRepository;
    private final OrganizationRepository organizationRepository;
    private final ObjectStorageService objectStorageService;

    @Value("${analyzer.url}")
    private String analyzerUrl;

    public ModelServiceImpl(UserLookupService userLookupService, ModelRepository modelRepository,
            OrganizationRepository organizationRepository,
            ObjectStorageService objectStorageService) {
        this.userLookupService = userLookupService;
        this.modelRepository = modelRepository;
        this.organizationRepository = organizationRepository;
        this.objectStorageService = objectStorageService;
    }

    public ModelServiceImpl(
            UserLookupService userLookupService,
            ModelRepository modelRepository,
            ObjectStorageService objectStorageService) {
        this(userLookupService, modelRepository, null, objectStorageService);
    }

    @Override
    public Model createModel(Long userId, Long organizationId, String name, MultipartFile modelFile) {
        User user = userLookupService.requireById(userId);
        Organization organization = organizationRepository != null
                ? organizationRepository.findById(organizationId).orElseThrow()
                : null;

        if (modelRepository.existsByNameAndOrganizationId(name, organizationId)) {
            throw new ModelAlreadyExistsException(name, user.getUsername());
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
        String objectKey = buildObjectKey(organizationId, name, fileName);
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
        model.setOrganization(organization);
        model.setCreatedBy(user);
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
    public List<Model> getModels(Long organizationId) {
        if (organizationRepository != null) {
            organizationRepository.findById(organizationId).orElseThrow();
            return modelRepository.findByOrganizationId(organizationId);
        }
        return modelRepository.findByUserId(organizationId);
    }

    public Model createModel(Long userId, String name, MultipartFile modelFile) {
        User user = userLookupService.requireById(userId);
        if (modelRepository.existsByNameAndUserId(name, userId)) {
            throw new ModelAlreadyExistsException(name, user.getUsername());
        }
        LinkedMultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("model_file", modelFile.getResource());
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        Map<String, Object> response = (Map<String, Object>) restTemplate.postForObject(
                analyzerUrl + "/metadata",
                new HttpEntity<>(body, headers),
                Map.class);
        String fileName = response.get("fileName") != null ? response.get("fileName").toString() : modelFile.getOriginalFilename();
        StoredObject stored;
        try {
            stored = objectStorageService.store(
                    buildObjectKey(userId, name, fileName),
                    fileName,
                    modelFile.getContentType(),
                    modelFile.getInputStream(),
                    modelFile.getSize());
        } catch (Exception ex) {
            throw new IllegalArgumentException("Model file is empty or invalid", ex);
        }
        Model model = new Model();
        model.setCreatedBy(user);
        model.setName(name);
        model.setType(response.get("type") != null ? response.get("type").toString() : null);
        model.setSpecificType(response.get("specificType") != null ? response.get("specificType").toString() : null);
        model.setFileName(fileName);
        model.setModelFile(new byte[0]);
        model.setStorageBucket(stored.bucket());
        model.setStorageObjectKey(stored.objectKey());
        model.setStorageEtag(stored.etag());
        model.setModelSizeBytes(stored.sizeBytes());
        return modelRepository.save(model);
    }

    public List<Model> getModelsByUser(Long userId) {
        userLookupService.requireById(userId);
        return modelRepository.findByUserId(userId);
    }

    private String buildObjectKey(Long organizationId, String modelName, String fileName) {
        String safeModelName = sanitizePathSegment(modelName);
        String safeFileName = sanitizePathSegment(fileName != null ? fileName : "model.bin");
        return "orgs/" + organizationId + "/models/" + safeModelName + "/" + UUID.randomUUID() + "/" + safeFileName;
    }

    private String sanitizePathSegment(String value) {
        return value
                .replaceAll("[^a-zA-Z0-9._-]", "_")
                .replaceAll("_+", "_");
    }

}
