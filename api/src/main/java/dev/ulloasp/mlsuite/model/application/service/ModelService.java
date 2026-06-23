/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.model.application.service;

import java.util.List;

import org.springframework.web.multipart.MultipartFile;

import dev.ulloasp.mlsuite.model.application.dto.ModelPageDto;
import dev.ulloasp.mlsuite.model.application.port.in.ModelCatalogUseCase;
import dev.ulloasp.mlsuite.model.domain.model.Model;

public interface ModelService extends ModelCatalogUseCase {

    public Model createModel(Long userId, String name, MultipartFile modelFile);

    public List<Model> getModels(Long userId);

    public ModelPageDto getModelPage(Long userId, int page, int size, String search, String sort, String status);

    public Model renameModel(Long userId, Long modelId, String name);

    public Model archiveModel(Long userId, Long modelId);

    public Model duplicateModel(Long userId, Long modelId, String name);

    public void deleteModel(Long userId, Long modelId);
}

