package dev.ulloasp.mlsuite.plugin.adapter.in.web;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import dev.ulloasp.mlsuite.plugin.application.dto.PluginDto;
import dev.ulloasp.mlsuite.util.PageDto;
import dev.ulloasp.mlsuite.plugin.application.dto.PluginStatsDto;
import dev.ulloasp.mlsuite.plugin.application.port.in.PluginCatalogUseCase;
import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/plugins")
public class PluginController {

    private final PluginCatalogUseCase pluginCatalogUseCase;

    @PostMapping
    public ResponseEntity<PluginDto> upload(
            CurrentUser user,
            @RequestParam("file") MultipartFile file) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(pluginCatalogUseCase.upload(user.userId(), file));
    }

    @GetMapping
    public ResponseEntity<PageDto<PluginDto>> getAll(
            CurrentUser user,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "24") int size,
            @RequestParam(name = "type", defaultValue = "all") String type,
            @RequestParam(name = "search", defaultValue = "") String search,
            @RequestParam(name = "sort", defaultValue = "updated") String sort) {
        return ResponseEntity.ok(pluginCatalogUseCase.list(
                user.userId(),
                page,
                size,
                type,
                search,
                sort));
    }

    @GetMapping("/stats")
    public ResponseEntity<PluginStatsDto> stats(CurrentUser user) {
        return ResponseEntity.ok(pluginCatalogUseCase.stats(user.userId()));
    }

    @DeleteMapping
    public ResponseEntity<Void> delete(CurrentUser user, @RequestParam("id") String id) {
        pluginCatalogUseCase.delete(user.userId(), id);
        return ResponseEntity.noContent().build();
    }
}

