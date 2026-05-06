package dev.ulloasp.mlsuite.plugin.adapter.in.web;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import dev.ulloasp.mlsuite.plugin.application.dto.PluginDto;
import dev.ulloasp.mlsuite.plugin.application.port.in.ActivatePluginUseCase;
import dev.ulloasp.mlsuite.plugin.application.port.in.DeactivateAllPluginsUseCase;
import dev.ulloasp.mlsuite.plugin.application.port.in.DeactivatePluginUseCase;
import dev.ulloasp.mlsuite.plugin.application.port.in.DeletePluginUseCase;
import dev.ulloasp.mlsuite.plugin.application.port.in.ListActivePluginsUseCase;
import dev.ulloasp.mlsuite.plugin.application.port.in.ListPluginsUseCase;
import dev.ulloasp.mlsuite.plugin.application.port.in.UploadPluginUseCase;
import dev.ulloasp.mlsuite.security.identity.CurrentUserResolver;

@RestController
public class PluginControllerImpl implements PluginController {

    private final CurrentUserResolver currentUserResolver;
    private final UploadPluginUseCase uploadPluginUseCase;
    private final ListPluginsUseCase listPluginsUseCase;
    private final ListActivePluginsUseCase listActivePluginsUseCase;
    private final ActivatePluginUseCase activatePluginUseCase;
    private final DeactivatePluginUseCase deactivatePluginUseCase;
    private final DeactivateAllPluginsUseCase deactivateAllPluginsUseCase;
    private final DeletePluginUseCase deletePluginUseCase;

    public PluginControllerImpl(
            CurrentUserResolver currentUserResolver,
            UploadPluginUseCase uploadPluginUseCase,
            ListPluginsUseCase listPluginsUseCase,
            ListActivePluginsUseCase listActivePluginsUseCase,
            ActivatePluginUseCase activatePluginUseCase,
            DeactivatePluginUseCase deactivatePluginUseCase,
            DeactivateAllPluginsUseCase deactivateAllPluginsUseCase,
            DeletePluginUseCase deletePluginUseCase) {
        this.currentUserResolver = currentUserResolver;
        this.uploadPluginUseCase = uploadPluginUseCase;
        this.listPluginsUseCase = listPluginsUseCase;
        this.listActivePluginsUseCase = listActivePluginsUseCase;
        this.activatePluginUseCase = activatePluginUseCase;
        this.deactivatePluginUseCase = deactivatePluginUseCase;
        this.deactivateAllPluginsUseCase = deactivateAllPluginsUseCase;
        this.deletePluginUseCase = deletePluginUseCase;
    }

    @Override
    public ResponseEntity<PluginDto> upload(Authentication authentication, MultipartFile file) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(uploadPluginUseCase.upload(currentUserResolver.resolve(authentication).userId(), file));
    }

    @Override
    public ResponseEntity<List<PluginDto>> getAll(Authentication authentication) {
        return ResponseEntity.ok(listPluginsUseCase.list(currentUserResolver.resolve(authentication).userId()));
    }

    @Override
    public ResponseEntity<List<PluginDto>> getActive(Authentication authentication) {
        return ResponseEntity.ok(listActivePluginsUseCase.getActive(currentUserResolver.resolve(authentication).userId()));
    }

    @Override
    public ResponseEntity<PluginDto> activate(Authentication authentication, String id) {
        return ResponseEntity.ok(activatePluginUseCase.activate(currentUserResolver.resolve(authentication).userId(), id));
    }

    @Override
    public ResponseEntity<Void> deactivate(Authentication authentication, String id) {
        deactivatePluginUseCase.deactivate(currentUserResolver.resolve(authentication).userId(), id);
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<Void> deactivateAll(Authentication authentication) {
        deactivateAllPluginsUseCase.deactivateAll(currentUserResolver.resolve(authentication).userId());
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<Void> delete(Authentication authentication, String id) {
        deletePluginUseCase.delete(currentUserResolver.resolve(authentication).userId(), id);
        return ResponseEntity.noContent().build();
    }
}

