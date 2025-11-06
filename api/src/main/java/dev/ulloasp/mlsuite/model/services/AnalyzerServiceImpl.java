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

import dev.ulloasp.mlsuite.model.exceptions.AnalyzerServiceException;
import dev.ulloasp.mlsuite.model.repositories.ModelRepository;
import dev.ulloasp.mlsuite.user.entity.OAuthProvider;
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

        public AnalyzerServiceImpl(ModelRepository modelRepository) {
                this.modelRepository = modelRepository;
        }

        @SuppressWarnings("unchecked")
        @Override
        public Map<String, Object> generateInputSignature(OAuthProvider oauthProvider, String oauthId,
                        MultipartFile model,
                        @Nullable MultipartFile dataframe) {
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
        public Map<String, Object> predict(OAuthProvider oauthProvider, String oauthId, Long modelId,
                        Map<String, Object> data) {

                byte[] bytes = modelRepository.findById(modelId)
                                .orElseThrow(() -> new IllegalArgumentException("Modelo no encontrado"))
                                .getModelFile();

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

}
