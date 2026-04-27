package dev.ulloasp.mlsuite.plugin.controllers;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;

import dev.ulloasp.mlsuite.plugin.dtos.PluginDto;

@RequestMapping("/api/plugins")
public interface PluginController {

    @PostMapping("/upload")
    ResponseEntity<PluginDto> upload(
            Authentication authentication,
            @RequestParam("file") MultipartFile file);

    @GetMapping("/all")
    ResponseEntity<List<PluginDto>> getAll(Authentication authentication);

    @GetMapping("/active")
    ResponseEntity<List<PluginDto>> getActive(Authentication authentication);

    @PostMapping("/activate")
    ResponseEntity<PluginDto> activate(
            Authentication authentication,
            @RequestParam("id") String id);

    @PostMapping("/deactivate")
    ResponseEntity<Void> deactivate(
            Authentication authentication,
            @RequestParam("id") String id);

    @PostMapping("/deactivate-all")
    ResponseEntity<Void> deactivateAll(Authentication authentication);

    @PostMapping("/delete")
    ResponseEntity<Void> delete(
            Authentication authentication,
            @RequestParam("id") String id);
}
