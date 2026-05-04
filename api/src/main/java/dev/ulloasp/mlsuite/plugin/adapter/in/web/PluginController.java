package dev.ulloasp.mlsuite.plugin.adapter.in.web;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
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
            OAuth2AuthenticationToken authentication,
            @RequestParam("file") MultipartFile file);

    @GetMapping
    ResponseEntity<List<PluginDto>> getAll(OAuth2AuthenticationToken authentication);

    @GetMapping("/active")
    ResponseEntity<List<PluginDto>> getActive(OAuth2AuthenticationToken authentication);

    @PutMapping("/activation")
    ResponseEntity<PluginDto> activate(
            OAuth2AuthenticationToken authentication,
            @RequestParam("id") String id);

    @DeleteMapping("/activation")
    ResponseEntity<Void> deactivate(
            OAuth2AuthenticationToken authentication,
            @RequestParam("id") String id);

    @DeleteMapping("/activations")
    ResponseEntity<Void> deactivateAll(OAuth2AuthenticationToken authentication);

    @DeleteMapping
    ResponseEntity<Void> delete(
            OAuth2AuthenticationToken authentication,
            @RequestParam("id") String id);
}

