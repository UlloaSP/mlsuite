/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.model.services;

import java.util.List;

import org.springframework.web.multipart.MultipartFile;

import dev.ulloasp.mlsuite.model.entities.Model;
import dev.ulloasp.mlsuite.user.entity.OAuthProvider;

public interface ModelService {

    public Model createModel(OAuthProvider oauthProvider, String oauthId, String name, MultipartFile modelFile);

    public List<Model> getModels(OAuthProvider oauthProvider, String oauthId);
}
