package dev.ulloasp.mlsuite.plugin.controllers;

import java.time.Instant;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import dev.ulloasp.mlsuite.plugin.dtos.PluginDto;
import dev.ulloasp.mlsuite.plugin.exceptions.PluginNotFoundException;
import dev.ulloasp.mlsuite.plugin.services.PluginService;
import dev.ulloasp.mlsuite.rbac.RbacPermissions;
import dev.ulloasp.mlsuite.security.identity.CurrentUser;
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
    public ResponseEntity<PluginDto> upload(Authentication authentication, MultipartFile file) {
        CurrentUser currentUser = currentUserResolver.resolve(authentication);
        require(currentUser, RbacPermissions.PLUGINS_MANAGE);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(pluginService.upload(currentUser.userId(), currentUser.activeOrganizationId(), file));
    }

    @Override
    public ResponseEntity<List<PluginDto>> getAll(Authentication authentication) {
        CurrentUser currentUser = currentUserResolver.resolve(authentication);
        require(currentUser, RbacPermissions.PLUGINS_READ);
        return ResponseEntity.ok(pluginService.list(currentUser.userId(), currentUser.activeOrganizationId()));
    }

    @Override
    public ResponseEntity<List<PluginDto>> getActive(Authentication authentication) {
        CurrentUser currentUser = currentUserResolver.resolve(authentication);
        require(currentUser, RbacPermissions.PLUGINS_READ);
        return ResponseEntity.ok(pluginService.getActive(currentUser.userId(), currentUser.activeOrganizationId()));
    }

    @Override
    public ResponseEntity<PluginDto> activate(Authentication authentication, String id) {
        CurrentUser currentUser = currentUserResolver.resolve(authentication);
        require(currentUser, RbacPermissions.PLUGINS_MANAGE);
        return ResponseEntity.ok(pluginService.activate(currentUser.userId(), currentUser.activeOrganizationId(), id));
    }

    @Override
    public ResponseEntity<Void> deactivate(Authentication authentication, String id) {
        CurrentUser currentUser = currentUserResolver.resolve(authentication);
        require(currentUser, RbacPermissions.PLUGINS_MANAGE);
        pluginService.deactivate(currentUser.userId(), currentUser.activeOrganizationId(), id);
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<Void> deactivateAll(Authentication authentication) {
        CurrentUser currentUser = currentUserResolver.resolve(authentication);
        require(currentUser, RbacPermissions.PLUGINS_MANAGE);
        pluginService.deactivateAll(currentUser.userId(), currentUser.activeOrganizationId());
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<Void> delete(Authentication authentication, String id) {
        CurrentUser currentUser = currentUserResolver.resolve(authentication);
        require(currentUser, RbacPermissions.PLUGINS_MANAGE);
        pluginService.delete(currentUser.userId(), currentUser.activeOrganizationId(), id);
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

    private void require(CurrentUser currentUser, String permission) {
        if (!currentUser.permissions().contains(permission)) {
            throw new dev.ulloasp.mlsuite.security.tenant.PermissionDeniedException(permission);
        }
    }
}
