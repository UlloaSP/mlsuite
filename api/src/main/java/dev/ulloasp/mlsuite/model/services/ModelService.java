/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.model.services;

import java.util.List;

import org.springframework.web.multipart.MultipartFile;

import dev.ulloasp.mlsuite.model.entities.Model;

public interface ModelService {

    public Model createModel(Long userId, Long organizationId, String name, MultipartFile modelFile);

    default Model createModel(Long userId, String name, MultipartFile modelFile) {
        return createModel(userId, userId, name, modelFile);
    }

    public List<Model> getModels(Long organizationId);

    default List<Model> getModelsByUser(Long userId) {
        return getModels(userId);
    }
}
