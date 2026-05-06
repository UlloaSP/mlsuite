package dev.ulloasp.mlsuite.plugin.adapter.in.web;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;

import dev.ulloasp.mlsuite.plugin.application.dto.PluginDto;

@RequestMapping("/api/plugins")
public interface PluginController {

    @PostMapping
    ResponseEntity<PluginDto> upload(
            Authentication authentication,
            @RequestParam("file") MultipartFile file);

    @GetMapping
    ResponseEntity<List<PluginDto>> getAll(Authentication authentication);

    @GetMapping("/active")
    ResponseEntity<List<PluginDto>> getActive(Authentication authentication);

    @PutMapping("/activation")
    ResponseEntity<PluginDto> activate(
            Authentication authentication,
            @RequestParam("id") String id);

    @DeleteMapping("/activation")
    ResponseEntity<Void> deactivate(
            Authentication authentication,
            @RequestParam("id") String id);

    @DeleteMapping("/activations")
    ResponseEntity<Void> deactivateAll(Authentication authentication);

    @DeleteMapping
    ResponseEntity<Void> delete(
            Authentication authentication,
            @RequestParam("id") String id);
}

