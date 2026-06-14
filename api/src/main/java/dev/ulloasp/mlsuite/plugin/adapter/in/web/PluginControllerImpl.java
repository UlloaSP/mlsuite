package dev.ulloasp.mlsuite.plugin.adapter.in.web;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import dev.ulloasp.mlsuite.plugin.application.dto.PluginDto;
import dev.ulloasp.mlsuite.plugin.application.dto.PluginPageDto;
import dev.ulloasp.mlsuite.plugin.application.dto.PluginStatsDto;
import dev.ulloasp.mlsuite.plugin.application.port.in.DeletePluginUseCase;
import dev.ulloasp.mlsuite.plugin.application.port.in.GetPluginStatsUseCase;
import dev.ulloasp.mlsuite.plugin.application.port.in.ListPluginsUseCase;
import dev.ulloasp.mlsuite.plugin.application.port.in.UploadPluginUseCase;
import dev.ulloasp.mlsuite.security.identity.CurrentUserResolver;

@RestController
public class PluginControllerImpl implements PluginController {

    private final CurrentUserResolver currentUserResolver;
    private final UploadPluginUseCase uploadPluginUseCase;
    private final ListPluginsUseCase listPluginsUseCase;
    private final GetPluginStatsUseCase getPluginStatsUseCase;
    private final DeletePluginUseCase deletePluginUseCase;

    public PluginControllerImpl(
            CurrentUserResolver currentUserResolver,
            UploadPluginUseCase uploadPluginUseCase,
            ListPluginsUseCase listPluginsUseCase,
            GetPluginStatsUseCase getPluginStatsUseCase,
            DeletePluginUseCase deletePluginUseCase) {
        this.currentUserResolver = currentUserResolver;
        this.uploadPluginUseCase = uploadPluginUseCase;
        this.listPluginsUseCase = listPluginsUseCase;
        this.getPluginStatsUseCase = getPluginStatsUseCase;
        this.deletePluginUseCase = deletePluginUseCase;
    }

    @Override
    public ResponseEntity<PluginDto> upload(Authentication authentication, MultipartFile file) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(uploadPluginUseCase.upload(currentUserResolver.resolve(authentication).userId(), file));
    }

    @Override
    public ResponseEntity<PluginPageDto> getAll(
            Authentication authentication,
            int page,
            int size,
            String type,
            String search,
            String sort) {
        return ResponseEntity.ok(listPluginsUseCase.list(
                currentUserResolver.resolve(authentication).userId(),
                page,
                size,
                type,
                search,
                sort));
    }

    @Override
    public ResponseEntity<PluginStatsDto> stats(Authentication authentication) {
        return ResponseEntity.ok(getPluginStatsUseCase.stats(currentUserResolver.resolve(authentication).userId()));
    }

    @Override
    public ResponseEntity<Void> delete(Authentication authentication, String id) {
        deletePluginUseCase.delete(currentUserResolver.resolve(authentication).userId(), id);
        return ResponseEntity.noContent().build();
    }
}

