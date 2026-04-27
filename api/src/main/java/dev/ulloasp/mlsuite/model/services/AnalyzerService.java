/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.model.services;

import java.util.Map;

import org.springframework.web.multipart.MultipartFile;

import dev.ulloasp.mlsuite.model.dtos.ExplainRequest;
import jakarta.annotation.Nullable;

public interface AnalyzerService {

        Map<String, Object> generateInputSignature(Long userId, MultipartFile model,
                        @Nullable MultipartFile dataframe);

        Map<String, Object> predict(Long userId, Long organizationId, Long modelId,
                        Map<String, Object> data);

        default Map<String, Object> predict(Long userId, Long modelId,
                        Map<String, Object> data) {
                return predict(userId, userId, modelId, data);
        }

        Map<String, Object> explain(Long userId, Long organizationId, Long modelId,
                        ExplainRequest request);

        default Map<String, Object> explain(Long userId, Long modelId,
                        ExplainRequest request) {
                return explain(userId, userId, modelId, request);
        }
}
