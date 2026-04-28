/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.model.application.service;

import java.util.List;

import org.springframework.web.multipart.MultipartFile;

import dev.ulloasp.mlsuite.model.application.port.in.ModelCatalogUseCase;
import dev.ulloasp.mlsuite.model.domain.model.Model;

public interface ModelService extends ModelCatalogUseCase {

    public Model createModel(Long userId, String name, MultipartFile modelFile);

    public List<Model> getModels(Long userId);
}

