/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.model.application.service;

import java.util.Map;
import java.util.List;

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

import dev.ulloasp.mlsuite.model.application.dto.ExplainRequest;
import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.model.domain.exception.AnalyzerServiceException;
import dev.ulloasp.mlsuite.model.domain.exception.ModelDoesNotExistsException;
import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.ModelRepository;
import dev.ulloasp.mlsuite.storage.ModelArtifactContentReader;
import dev.ulloasp.mlsuite.user.application.service.UserLookupService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;
import jakarta.annotation.Nullable;
import jakarta.transaction.Transactional;

@Service
@Transactional
public class AnalyzerServiceImpl implements AnalyzerService {

    private final RestTemplate restTemplate;
    private final ModelRepository modelRepository;
    private final ModelArtifactContentReader artifactReader;
    private final UserLookupService userLookupService;
    private final WorkspaceAccessService workspaceAccessService;
    private final ObjectMapper objectMapper;

    @Value("${analyzer.url}")
    private String analyzerUrl;

    public AnalyzerServiceImpl(
            RestTemplate restTemplate,
            ModelRepository modelRepository,
            ModelArtifactContentReader artifactReader,
            UserLookupService userLookupService,
            WorkspaceAccessService workspaceAccessService,
            ObjectMapper objectMapper) {
        this.restTemplate = restTemplate;
        this.modelRepository = modelRepository;
        this.artifactReader = artifactReader;
        this.userLookupService = userLookupService;
        this.workspaceAccessService = workspaceAccessService;
        this.objectMapper = objectMapper;
    }

    @Override
    public Map<String, Object> generateInputSchema(
            Long userId,
            MultipartFile model,
            @Nullable MultipartFile dataframe,
            String oneHotSeparator) {
        userLookupService.requireById(userId);
        LinkedMultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("model_file", model.getResource());
        body.add("onehot_separator", oneHotSeparator);
        if (dataframe != null) {
            body.add("df_file", dataframe.getResource());
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);
        try {
            return postForMap(analyzerUrl + "/build_schema", requestEntity);
        } catch (RestClientResponseException ex) {
            throw AnalyzerServiceException.fromRestClient(ex, analyzerUrl + "/build_schema");
        } catch (ResourceAccessException ex) {
            throw AnalyzerServiceException.fromNetwork(ex, analyzerUrl + "/build_schema");
        }
    }

    @Override
    public Map<String, Object> inspectArtifact(Long userId, MultipartFile artifact) {
        userLookupService.requireById(userId);
        LinkedMultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("artifact_file", artifact.getResource());

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        String endpoint = analyzerUrl + "/inspect_artifact";
        HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);
        Object response;
        try {
            response = restTemplate.postForObject(endpoint, requestEntity, Map.class);
        } catch (RestClientResponseException ex) {
            throw AnalyzerServiceException.fromRestClient(ex, endpoint);
        } catch (ResourceAccessException ex) {
            throw AnalyzerServiceException.fromNetwork(ex, endpoint);
        }

        return (Map<String, Object>) response;
    }

    @SuppressWarnings("unchecked")
    @Override
    public Map<String, Object> matchArtifacts(Long userId, List<MultipartFile> models, List<MultipartFile> dataframes) {
        userLookupService.requireById(userId);
        LinkedMultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        models.forEach(model -> body.add("model_files", model.getResource()));
        dataframes.forEach(dataframe -> body.add("dataframe_files", dataframe.getResource()));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        String endpoint = analyzerUrl + "/match_artifacts";
        HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);
        Object response;
        try {
            response = restTemplate.postForObject(endpoint, requestEntity, Map.class);
        } catch (RestClientResponseException ex) {
            throw AnalyzerServiceException.fromRestClient(ex, endpoint);
        } catch (ResourceAccessException ex) {
            throw AnalyzerServiceException.fromNetwork(ex, endpoint);
        }

        return (Map<String, Object>) response;
    }

    @SuppressWarnings("unchecked")
    @Override
    public Map<String, Object> predict(Long userId, Long modelId, Map<String, Object> data) {
        Model model = requireModel(userId, modelId);
        byte[] bytes = artifactReader.loadVerified(model);

        MultipartBodyBuilder builder = new MultipartBodyBuilder();
        builder.part("model_file", bytes)
                .filename(model.getFileName())
                .contentType(MediaType.APPLICATION_OCTET_STREAM);
        try {
            builder.part("data", objectMapper.writeValueAsString(data))
                    .contentType(MediaType.APPLICATION_JSON);
        } catch (Exception ex) {
            throw new RuntimeException("Error al serializar los datos a JSON", ex);
        }

        HttpEntity<MultiValueMap<String, HttpEntity<?>>> req = new HttpEntity<>(builder.build());
        try {
            return postForMap(analyzerUrl + "/predict", req);
        } catch (RestClientResponseException ex) {
            throw AnalyzerServiceException.fromRestClient(ex, analyzerUrl + "/predict");
        } catch (ResourceAccessException ex) {
            throw AnalyzerServiceException.fromNetwork(ex, analyzerUrl + "/predict");
        }
    }

    @Override
    public Map<String, Object> explain(Long userId, Long modelId, ExplainRequest request) {
        Model model = requireModel(userId, modelId);
        byte[] bytes = artifactReader.loadVerified(model);

        MultipartBodyBuilder builder = new MultipartBodyBuilder();
        builder.part("model_file", bytes)
                .filename(model.getFileName())
                .contentType(MediaType.APPLICATION_OCTET_STREAM);
        try {
            builder.part("data", objectMapper.writeValueAsString(request.instance()))
                    .contentType(MediaType.APPLICATION_JSON);
            builder.part("traces", objectMapper.writeValueAsString(request.traces()))
                    .contentType(MediaType.APPLICATION_JSON);
        } catch (Exception ex) {
            throw new RuntimeException("Error serializing explain request", ex);
        }

        HttpEntity<MultiValueMap<String, HttpEntity<?>>> req = new HttpEntity<>(builder.build());
        try {
            return postForMap(analyzerUrl + "/explain", req);
        } catch (RestClientResponseException ex) {
            throw AnalyzerServiceException.fromRestClient(ex, analyzerUrl + "/explain");
        } catch (ResourceAccessException ex) {
            throw AnalyzerServiceException.fromNetwork(ex, analyzerUrl + "/explain");
        }
    }

    private Map<String, Object> postForMap(String url, Object request) {
        Map<?, ?> response = restTemplate.postForObject(url, request, Map.class);
        if (response == null) {
            return Map.of();
        }
        return response.entrySet().stream()
                .filter(entry -> entry.getKey() instanceof String)
                .collect(java.util.stream.Collectors.toMap(
                        entry -> (String) entry.getKey(),
                        Map.Entry::getValue));
    }

    private Model requireModel(Long userId, Long modelId) {
        Long organizationId = workspaceAccessService.requireCurrentOrganization(userId).getId();
        return modelRepository.findByIdAndOrganizationId(modelId, organizationId)
                .orElseThrow(() -> new ModelDoesNotExistsException(modelId, userLookupService.requireById(userId).getUsername()));
    }
}
