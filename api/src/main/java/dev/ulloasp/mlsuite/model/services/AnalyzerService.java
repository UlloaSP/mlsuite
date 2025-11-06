/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.model.services;

import java.util.Map;

import org.springframework.web.multipart.MultipartFile;

import dev.ulloasp.mlsuite.user.entity.OAuthProvider;
import jakarta.annotation.Nullable;

public interface AnalyzerService {

        Map<String, Object> generateInputSignature(OAuthProvider oauthProvider, String oauthId, MultipartFile model,
                        @Nullable MultipartFile dataframe);

        Map<String, Object> predict(OAuthProvider oauthProvider, String oauthId, Long modelId,
                        Map<String, Object> data);
}
