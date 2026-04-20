package dev.ulloasp.mlsuite.customexplanation.controllers;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;

import dev.ulloasp.mlsuite.customexplanation.dtos.CustomExplanationDto;

@RequestMapping("/api/custom-explanation")
public interface CustomExplanationController {

    @PostMapping("/upload")
    ResponseEntity<CustomExplanationDto> upload(
            OAuth2AuthenticationToken authentication,
            @RequestParam("file") MultipartFile file);

    @GetMapping("/all")
    ResponseEntity<List<CustomExplanationDto>> getAll(OAuth2AuthenticationToken authentication);

    @GetMapping("/active")
    ResponseEntity<List<CustomExplanationDto>> getActive(OAuth2AuthenticationToken authentication);

    @PostMapping("/activate")
    ResponseEntity<CustomExplanationDto> activate(
            OAuth2AuthenticationToken authentication,
            @RequestParam("id") String id);

    @PostMapping("/deactivate")
    ResponseEntity<Void> deactivate(
            OAuth2AuthenticationToken authentication,
            @RequestParam("id") String id);

    @PostMapping("/deactivate-all")
    ResponseEntity<Void> deactivateAll(OAuth2AuthenticationToken authentication);

    @PostMapping("/delete")
    ResponseEntity<Void> delete(
            OAuth2AuthenticationToken authentication,
            @RequestParam("id") String id);
}
