/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.model.application.service;

import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.multipart.MultipartFile;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import dev.ulloasp.mlsuite.model.adapter.out.analyzer.AnalyzerClient;
import dev.ulloasp.mlsuite.model.adapter.out.analyzer.ModelRuntimeClient;
import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.ModelRepository;
import dev.ulloasp.mlsuite.model.application.dto.ExplainRequest;
import dev.ulloasp.mlsuite.model.application.port.in.AnalyzerUseCase;
import dev.ulloasp.mlsuite.model.domain.exception.ModelDoesNotExistsException;
import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.schema.application.service.RuntimeSlots;
import dev.ulloasp.mlsuite.storage.ModelArtifactReference;
import dev.ulloasp.mlsuite.user.application.service.UserLookupService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;
import lombok.RequiredArgsConstructor;

/**
 * Runtime calls of workspace members. Nothing here is transactional and these endpoints are left
 * out of open-in-view (see OpenInViewConfig): the caller and model are resolved in short reads,
 * and the runtime is called in a {@link WorkspaceRuntimeSlots} slot with no connection held. A
 * call takes its member's place in the share's queue before any database work.
 */
@Service
@RequiredArgsConstructor
public class AnalyzerServiceImpl implements AnalyzerUseCase {

    private final AnalyzerClient analyzerClient;
    private final ModelRuntimeClient modelRuntime;
    private final WorkspaceRuntimeSlots slots;
    private final ModelRepository modelRepository;
    private final UserLookupService userLookupService;
    private final WorkspaceAuthorizationService authorizationService;
    private final ObjectMapper objectMapper;

    @Override
    public Map<String, Object> inspectArtifact(Long userId, MultipartFile artifact) {
        userLookupService.requireById(userId);
        LinkedMultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("model_file", artifact.getResource());
        return slots.run(userId, () -> analyzerClient.inspect(body));
    }

    @Override
    public Map<String, Object> explain(Long userId, Long modelId, ExplainRequest request) {
        try (RuntimeSlots.Admission admission = slots.admit(userId)) {
            ModelArtifactReference artifact = requireRunnableModel(userId, modelId);
            Map<String, String> fields = Map.of("data", json(request.instance()), "traces", json(request.traces()));
            return admission.run(() -> modelRuntime.run("/explain", artifact, fields));
        }
    }

    private String json(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            throw new IllegalArgumentException("Analyzer request is not serializable as JSON", ex);
        }
    }

    /** Explaining a model executes it, which requires permission to run predictions. */
    private ModelArtifactReference requireRunnableModel(Long userId, Long modelId) {
        Long organizationId = authorizationService.requireCurrent(userId, PermissionKey.RUN_PREDICTIONS).getId();
        return modelRepository.findArtifactReference(modelId, organizationId)
                .orElseThrow(() -> new ModelDoesNotExistsException(modelId, userLookupService.requireById(userId).getUsername()));
    }
}
