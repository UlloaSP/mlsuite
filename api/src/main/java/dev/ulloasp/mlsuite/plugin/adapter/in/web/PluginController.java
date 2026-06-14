package dev.ulloasp.mlsuite.plugin.adapter.in.web;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;

import dev.ulloasp.mlsuite.plugin.application.dto.PluginDto;
import dev.ulloasp.mlsuite.plugin.application.dto.PluginPageDto;
import dev.ulloasp.mlsuite.plugin.application.dto.PluginStatsDto;

@RequestMapping("/api/plugins")
public interface PluginController {

    @PostMapping
    ResponseEntity<PluginDto> upload(
            Authentication authentication,
            @RequestParam("file") MultipartFile file);

    @GetMapping
    ResponseEntity<PluginPageDto> getAll(
            Authentication authentication,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "24") int size,
            @RequestParam(name = "type", defaultValue = "all") String type,
            @RequestParam(name = "search", defaultValue = "") String search,
            @RequestParam(name = "sort", defaultValue = "updated") String sort);

    @GetMapping("/stats")
    ResponseEntity<PluginStatsDto> stats(Authentication authentication);

    @DeleteMapping
    ResponseEntity<Void> delete(
            Authentication authentication,
            @RequestParam("id") String id);
}

