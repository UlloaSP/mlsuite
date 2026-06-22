/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.model.adapter.in.web;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;

import dev.ulloasp.mlsuite.model.application.dto.CreateModelDto;
import dev.ulloasp.mlsuite.model.application.dto.ModelDto;
import jakarta.annotation.Nullable;

@RequestMapping("/api/models")
public interface ModelController {

    @PostMapping
    public ResponseEntity<CreateModelDto> createModel(Authentication authentication,
            @RequestParam String name, @RequestParam MultipartFile modelFile,
            @RequestParam @Nullable MultipartFile dataframeFile,
            @RequestParam(defaultValue = "__") String oneHotSeparator);

    @GetMapping
    public ResponseEntity<List<ModelDto>> getAllModels(Authentication authentication);

}

