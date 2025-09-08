package dev.ulloasp.mlsuite.model.controllers;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;

import dev.ulloasp.mlsuite.model.dtos.CreateModelDto;
import dev.ulloasp.mlsuite.model.dtos.ModelDto;
import jakarta.annotation.Nullable;

@RequestMapping("/api/model")
public interface ModelController {

    @PostMapping("/create")
    public ResponseEntity<CreateModelDto> createModel(OAuth2AuthenticationToken authentication,
            @RequestParam String name, @RequestParam MultipartFile modelFile,
            @RequestParam @Nullable MultipartFile dataframeFile);

    @GetMapping("/all")
    public ResponseEntity<List<ModelDto>> getAllModels(OAuth2AuthenticationToken authentication);

}
