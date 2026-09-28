/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.model.adapter.in.web;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import dev.ulloasp.mlsuite.model.application.dto.CreateModelDto;
import dev.ulloasp.mlsuite.model.application.dto.ModelDto;
import dev.ulloasp.mlsuite.util.PageDto;
import dev.ulloasp.mlsuite.model.application.port.in.ModelCatalogUseCase;
import dev.ulloasp.mlsuite.model.application.port.in.ModelCreationUseCase;
import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import jakarta.annotation.Nullable;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/models")
public class ModelController {

    private final ModelCatalogUseCase modelCatalogUseCase;
    private final ModelCreationUseCase modelCreationUseCase;

    @PostMapping
    public ResponseEntity<CreateModelDto> createModel(
            CurrentUser user,
            @RequestParam String name,
            @RequestParam MultipartFile modelFile,
            @RequestParam @Nullable MultipartFile dataframeFile,
            @RequestParam(defaultValue = "__") String oneHotSeparator) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(modelCreationUseCase.create(
                        user.userId(),
                        name,
                        modelFile,
                        dataframeFile,
                        oneHotSeparator));
    }

    @GetMapping
    public ResponseEntity<PageDto<ModelDto>> getModelPage(
            CurrentUser user,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "24") int size,
            @RequestParam(name = "search", defaultValue = "") String search,
            @RequestParam(name = "sort", defaultValue = "updated") String sort,
            @RequestParam(name = "status", defaultValue = "active") String status) {
        return ResponseEntity.ok(modelCatalogUseCase.getModelPage(
                user.userId(),
                page,
                size,
                search,
                sort,
                status));
    }

    @GetMapping("/all")
    public ResponseEntity<List<ModelDto>> getAllModels(CurrentUser user) {
        List<Model> models = modelCatalogUseCase.getModels(user.userId());
        return ResponseEntity.ok(ModelDto.toDtoList(models));
    }

    @GetMapping("/{modelId}")
    public ResponseEntity<ModelDto> getModel(CurrentUser user, @PathVariable Long modelId) {
        return ResponseEntity.ok(ModelDto.toDto(modelCatalogUseCase.getModel(
                user.userId(),
                modelId)));
    }

    @PatchMapping("/{modelId}")
    public ResponseEntity<ModelDto> rename(
            CurrentUser user,
            @PathVariable Long modelId,
            @RequestParam String name,
            @RequestParam(required = false) Long version) {
        return ResponseEntity.ok(ModelDto.toDto(modelCatalogUseCase.renameModel(
                user.userId(),
                modelId,
                name,
                version)));
    }

    @PostMapping("/{modelId}/archive")
    public ResponseEntity<ModelDto> archive(
            CurrentUser user,
            @PathVariable Long modelId,
            @RequestParam(required = false) Long version) {
        return ResponseEntity.ok(ModelDto.toDto(modelCatalogUseCase.archiveModel(
                user.userId(),
                modelId,
                version)));
    }

    @PostMapping("/{modelId}/duplicate")
    public ResponseEntity<ModelDto> duplicate(
            CurrentUser user,
            @PathVariable Long modelId,
            @RequestParam String name) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ModelDto.toDto(modelCatalogUseCase.duplicateModel(
                user.userId(),
                modelId,
                name)));
    }

    @DeleteMapping("/{modelId}")
    public ResponseEntity<Void> delete(
            CurrentUser user,
            @PathVariable Long modelId,
            @RequestParam(required = false) Long version) {
        modelCatalogUseCase.deleteModel(user.userId(), modelId, version);
        return ResponseEntity.noContent().build();
    }
}
