/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.model.application.service;

import java.util.List;
import java.util.Map;

import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.multipart.MultipartFile;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import dev.ulloasp.mlsuite.model.adapter.out.analyzer.AnalyzerClient;
import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.ModelRepository;
import dev.ulloasp.mlsuite.model.application.dto.ExplainRequest;
import dev.ulloasp.mlsuite.model.application.port.in.AnalyzerUseCase;
import dev.ulloasp.mlsuite.model.domain.exception.ModelDoesNotExistsException;
import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.storage.ModelArtifactContentReader;
import dev.ulloasp.mlsuite.user.application.service.UserLookupService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;
import jakarta.annotation.Nullable;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@Transactional
@RequiredArgsConstructor
public class AnalyzerServiceImpl implements AnalyzerUseCase {

    private final AnalyzerClient analyzerClient;
    private final ModelRepository modelRepository;
    private final ModelArtifactContentReader artifactReader;
    private final UserLookupService userLookupService;
    private final WorkspaceAuthorizationService authorizationService;
    private final ObjectMapper objectMapper;

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
        return analyzerClient.post("/build_schema", body);
    }

    @Override
    public Map<String, Object> inspectArtifact(Long userId, MultipartFile artifact) {
        userLookupService.requireById(userId);
        LinkedMultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("artifact_file", artifact.getResource());
        return analyzerClient.post("/inspect_artifact", body);
    }

    @Override
    public Map<String, Object> matchArtifacts(Long userId, List<MultipartFile> models, List<MultipartFile> dataframes) {
        userLookupService.requireById(userId);
        LinkedMultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        models.forEach(model -> body.add("model_files", model.getResource()));
        dataframes.forEach(dataframe -> body.add("dataframe_files", dataframe.getResource()));
        return analyzerClient.post("/match_artifacts", body);
    }

    @Override
    public Map<String, Object> predict(Long userId, Long modelId, Map<String, Object> data) {
        MultipartBodyBuilder builder = modelParts(requireRunnableModel(userId, modelId));
        builder.part("data", json(data)).contentType(MediaType.APPLICATION_JSON);
        return analyzerClient.post("/predict", builder.build());
    }

    @Override
    public Map<String, Object> explain(Long userId, Long modelId, ExplainRequest request) {
        MultipartBodyBuilder builder = modelParts(requireRunnableModel(userId, modelId));
        builder.part("data", json(request.instance())).contentType(MediaType.APPLICATION_JSON);
        builder.part("traces", json(request.traces())).contentType(MediaType.APPLICATION_JSON);
        return analyzerClient.post("/explain", builder.build());
    }

    private MultipartBodyBuilder modelParts(Model model) {
        MultipartBodyBuilder builder = new MultipartBodyBuilder();
        builder.part("model_file", artifactReader.loadVerified(model))
                .filename(model.getFileName())
                .contentType(MediaType.APPLICATION_OCTET_STREAM);
        return builder;
    }

    private String json(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            throw new IllegalArgumentException("Analyzer request is not serializable as JSON", ex);
        }
    }

    /** Executing a model, whether to predict or to explain, requires permission to run predictions. */
    private Model requireRunnableModel(Long userId, Long modelId) {
        Long organizationId = authorizationService.requireCurrent(userId, PermissionKey.RUN_PREDICTIONS).getId();
        return modelRepository.findByIdAndOrganizationId(modelId, organizationId)
                .orElseThrow(() -> new ModelDoesNotExistsException(modelId, userLookupService.requireById(userId).getUsername()));
    }
}
