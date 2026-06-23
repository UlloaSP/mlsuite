/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.model.adapter.in.web;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;

import dev.ulloasp.mlsuite.model.application.dto.CreateModelDto;
import dev.ulloasp.mlsuite.model.application.dto.ModelDto;
import dev.ulloasp.mlsuite.model.application.dto.ModelPageDto;
import jakarta.annotation.Nullable;

@RequestMapping("/api/models")
public interface ModelController {

    @PostMapping
    public ResponseEntity<CreateModelDto> createModel(Authentication authentication,
            @RequestParam String name, @RequestParam MultipartFile modelFile,
            @RequestParam @Nullable MultipartFile dataframeFile,
            @RequestParam(defaultValue = "__") String oneHotSeparator);

    @GetMapping
    public ResponseEntity<ModelPageDto> getModelPage(
            Authentication authentication,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "24") int size,
            @RequestParam(name = "search", defaultValue = "") String search,
            @RequestParam(name = "sort", defaultValue = "updated") String sort,
            @RequestParam(name = "status", defaultValue = "active") String status);

    @GetMapping("/all")
    public ResponseEntity<List<ModelDto>> getAllModels(Authentication authentication);

    @PatchMapping("/{modelId}")
    public ResponseEntity<ModelDto> rename(
            Authentication authentication,
            @PathVariable Long modelId,
            @RequestParam String name);

    @PostMapping("/{modelId}/archive")
    public ResponseEntity<ModelDto> archive(Authentication authentication, @PathVariable Long modelId);

    @PostMapping("/{modelId}/duplicate")
    public ResponseEntity<ModelDto> duplicate(
            Authentication authentication,
            @PathVariable Long modelId,
            @RequestParam String name);

    @DeleteMapping("/{modelId}")
    public ResponseEntity<Void> delete(Authentication authentication, @PathVariable Long modelId);

}

