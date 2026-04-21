package dev.ulloasp.mlsuite.customreport.controllers;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;

import dev.ulloasp.mlsuite.customreport.dtos.CustomReportDto;

@RequestMapping("/api/custom-report")
public interface CustomReportController {

    @PostMapping("/upload")
    ResponseEntity<CustomReportDto> upload(
            OAuth2AuthenticationToken authentication,
            @RequestParam("file") MultipartFile file);

    @GetMapping("/all")
    ResponseEntity<List<CustomReportDto>> getAll(OAuth2AuthenticationToken authentication);

    @GetMapping("/active")
    ResponseEntity<List<CustomReportDto>> getActive(OAuth2AuthenticationToken authentication);

    @PostMapping("/activate")
    ResponseEntity<CustomReportDto> activate(
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
