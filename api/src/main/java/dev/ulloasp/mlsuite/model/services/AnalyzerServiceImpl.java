/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.model.services;

import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import com.fasterxml.jackson.databind.ObjectMapper;

import dev.ulloasp.mlsuite.model.dtos.ExplainRequest;
import dev.ulloasp.mlsuite.model.entities.Model;
import dev.ulloasp.mlsuite.model.exceptions.AnalyzerServiceException;
import dev.ulloasp.mlsuite.model.exceptions.ModelDoesNotExistsException;
import dev.ulloasp.mlsuite.model.repositories.ModelRepository;
import dev.ulloasp.mlsuite.storage.ObjectStorageException;
import dev.ulloasp.mlsuite.storage.ObjectStorageService;
import dev.ulloasp.mlsuite.user.entity.User;
import dev.ulloasp.mlsuite.user.service.UserLookupService;
import jakarta.annotation.Nullable;
import jakarta.transaction.Transactional;

@Service
@Transactional
public class AnalyzerServiceImpl implements AnalyzerService {

        @Autowired
        private RestTemplate restTemplate;

        @Value("${analyzer.url}")
        private String analyzerUrl;

        private final ModelRepository modelRepository;
        private final ObjectStorageService objectStorageService;
        private final UserLookupService userLookupService;

        public AnalyzerServiceImpl(
                        ModelRepository modelRepository,
                        ObjectStorageService objectStorageService,
                        UserLookupService userLookupService) {
                this.modelRepository = modelRepository;
                this.objectStorageService = objectStorageService;
                this.userLookupService = userLookupService;
        }

        @SuppressWarnings("unchecked")
        @Override
        public Map<String, Object> generateInputSignature(Long userId, MultipartFile model,
                        @Nullable MultipartFile dataframe) {
                userLookupService.requireById(userId);
                LinkedMultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
                body.add("model_file", model.getResource());
                if (dataframe != null) {
                        body.add("df_file", dataframe.getResource());
                }

                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.MULTIPART_FORM_DATA);

                HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);
                Object response;
                try {
                        response = restTemplate.postForObject(analyzerUrl + "/build_schema",
                                        requestEntity,
                                        Map.class);
                } catch (RestClientResponseException ex) {
                        // FastAPI returned 4xx/5xx (e.g., HTTPException(400, "Not a sklearn
                        // estimator."))
                        throw AnalyzerServiceException.fromRestClient(ex, analyzerUrl + "/build_schema");
                } catch (ResourceAccessException ex) {
                        // Network/unavailable
                        throw AnalyzerServiceException.fromNetwork(ex, analyzerUrl + "/build_schema");
                }

                return (Map<String, Object>) response;
        }

        @SuppressWarnings("unchecked")
        @Override
        public Map<String, Object> predict(Long userId, Long modelId, Map<String, Object> data) {
                Model model = requireModel(userId, modelId);

                byte[] bytes = loadModelBytes(model);

                MultipartBodyBuilder builder = new MultipartBodyBuilder();

                builder.part("model_file", bytes)
                                .filename("model.joblib") // ← nombre visible en FastAPI
                                .contentType(MediaType.APPLICATION_OCTET_STREAM);

                String json = "";
                try {
                        json = new ObjectMapper().writeValueAsString(data);
                } catch (Exception e) {
                        throw new RuntimeException("Error al serializar los datos a JSON", e);
                }

                builder.part("data", json)
                                .contentType(MediaType.APPLICATION_JSON);

                MultiValueMap<String, HttpEntity<?>> multipartBody = builder.build();
                HttpEntity<MultiValueMap<String, HttpEntity<?>>> req = new HttpEntity<>(multipartBody);

                // NO establezcas Content-Type ni Accept; los pone el builder
                Object response;
                try {
                        response = restTemplate.postForObject(analyzerUrl + "/predict", req, Map.class);

                } catch (RestClientResponseException ex) {
                        // FastAPI returned 4xx/5xx (e.g., HTTPException(400, "Not a sklearn
                        // estimator."))
                        throw AnalyzerServiceException.fromRestClient(ex, analyzerUrl + "/predict");
                } catch (ResourceAccessException ex) {
                        // Network/unavailable
                        throw AnalyzerServiceException.fromNetwork(ex, analyzerUrl + "/predict");
                }

                return (Map<String, Object>) response;
        }

        @SuppressWarnings("unchecked")
        @Override
        public Map<String, Object> explain(Long userId, Long modelId, ExplainRequest request) {
                Model model = requireModel(userId, modelId);

                byte[] bytes = loadModelBytes(model);

                MultipartBodyBuilder builder = new MultipartBodyBuilder();
                builder.part("model_file", bytes)
                                .filename("model.joblib")
                                .contentType(MediaType.APPLICATION_OCTET_STREAM);

                String instanceJson;
                String tracesJson;
                try {
                        ObjectMapper mapper = new ObjectMapper();
                        instanceJson = mapper.writeValueAsString(request.getInstance());
                        tracesJson = mapper.writeValueAsString(
                                        request.getTraces() != null ? request.getTraces() : java.util.List.of());
                } catch (Exception e) {
                        throw new RuntimeException("Error serializing explain request", e);
                }

                builder.part("data", instanceJson).contentType(MediaType.APPLICATION_JSON);
                builder.part("traces", tracesJson).contentType(MediaType.APPLICATION_JSON);

                MultiValueMap<String, HttpEntity<?>> multipartBody = builder.build();
                HttpEntity<MultiValueMap<String, HttpEntity<?>>> req = new HttpEntity<>(multipartBody);

                Object response;
                try {
                        response = restTemplate.postForObject(analyzerUrl + "/explain", req, Map.class);
                } catch (RestClientResponseException ex) {
                        throw AnalyzerServiceException.fromRestClient(ex, analyzerUrl + "/explain");
                } catch (ResourceAccessException ex) {
                        throw AnalyzerServiceException.fromNetwork(ex, analyzerUrl + "/explain");
                }

                return (Map<String, Object>) response;
        }

        private byte[] loadModelBytes(Model model) {
                if (model.hasStoredObject()) {
                        try {
                                return objectStorageService.load(model.getStorageBucket(), model.getStorageObjectKey());
                        } catch (ObjectStorageException ex) {
                                if (model.hasInlineModelFile()) {
                                        return model.getModelFile();
                                }
                                throw ex;
                        }
                }

                if (model.hasInlineModelFile()) {
                        return model.getModelFile();
                }

                throw new IllegalStateException("El modelo no tiene binario en object storage ni en base de datos");
        }

        private Model requireModel(Long userId, Long modelId) {
                User user = userLookupService.requireById(userId);
                return modelRepository.findByIdAndUserId(modelId, userId)
                                .orElseThrow(() -> new ModelDoesNotExistsException(modelId, user.getUsername()));
        }

}
