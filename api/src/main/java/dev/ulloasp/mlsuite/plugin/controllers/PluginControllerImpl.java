package dev.ulloasp.mlsuite.plugin.controllers;

import java.time.Instant;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import dev.ulloasp.mlsuite.plugin.dtos.PluginDto;
import dev.ulloasp.mlsuite.plugin.exceptions.PluginNotFoundException;
import dev.ulloasp.mlsuite.plugin.services.PluginService;
import dev.ulloasp.mlsuite.security.identity.CurrentUserResolver;
import dev.ulloasp.mlsuite.util.ErrorDto;
import jakarta.servlet.http.HttpServletRequest;

@RestController
public class PluginControllerImpl implements PluginController {

    private final CurrentUserResolver currentUserResolver;
    private final PluginService pluginService;

    public PluginControllerImpl(CurrentUserResolver currentUserResolver, PluginService pluginService) {
        this.currentUserResolver = currentUserResolver;
        this.pluginService = pluginService;
    }

    @Override
    public ResponseEntity<PluginDto> upload(OAuth2AuthenticationToken authentication, MultipartFile file) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(pluginService.upload(currentUserResolver.resolve(authentication).userId(), file));
    }

    @Override
    public ResponseEntity<List<PluginDto>> getAll(OAuth2AuthenticationToken authentication) {
        return ResponseEntity.ok(pluginService.list(currentUserResolver.resolve(authentication).userId()));
    }

    @Override
    public ResponseEntity<List<PluginDto>> getActive(OAuth2AuthenticationToken authentication) {
        return ResponseEntity.ok(pluginService.getActive(currentUserResolver.resolve(authentication).userId()));
    }

    @Override
    public ResponseEntity<PluginDto> activate(OAuth2AuthenticationToken authentication, String id) {
        return ResponseEntity.ok(pluginService.activate(currentUserResolver.resolve(authentication).userId(), id));
    }

    @Override
    public ResponseEntity<Void> deactivate(OAuth2AuthenticationToken authentication, String id) {
        pluginService.deactivate(currentUserResolver.resolve(authentication).userId(), id);
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<Void> deactivateAll(OAuth2AuthenticationToken authentication) {
        pluginService.deactivateAll(currentUserResolver.resolve(authentication).userId());
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<Void> delete(OAuth2AuthenticationToken authentication, String id) {
        pluginService.delete(currentUserResolver.resolve(authentication).userId(), id);
        return ResponseEntity.noContent().build();
    }

    @ExceptionHandler(PluginNotFoundException.class)
    public ResponseEntity<ErrorDto> handlePluginNotFound(PluginNotFoundException exception, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ErrorDto.of(HttpStatus.NOT_FOUND.value(), exception.getMessage(), request.getRequestURI()));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ErrorDto> handleIllegalState(IllegalStateException exception, HttpServletRequest request) {
        ErrorDto dto = new ErrorDto(
                Instant.now(),
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                exception.getMessage(),
                request.getRequestURI());
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(dto);
    }
}
