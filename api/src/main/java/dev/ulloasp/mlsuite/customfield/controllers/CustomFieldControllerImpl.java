package dev.ulloasp.mlsuite.customfield.controllers;

import java.time.Instant;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import dev.ulloasp.mlsuite.customfield.dtos.CustomFieldDto;
import dev.ulloasp.mlsuite.customfield.exceptions.CustomFieldNotFoundException;
import dev.ulloasp.mlsuite.customfield.services.CustomFieldService;
import dev.ulloasp.mlsuite.security.identity.CurrentUserResolver;
import dev.ulloasp.mlsuite.util.ErrorDto;
import jakarta.servlet.http.HttpServletRequest;

@RestController
public class CustomFieldControllerImpl implements CustomFieldController {

    private final CurrentUserResolver currentUserResolver;
    private final CustomFieldService customFieldService;

    public CustomFieldControllerImpl(CurrentUserResolver currentUserResolver, CustomFieldService customFieldService) {
        this.currentUserResolver = currentUserResolver;
        this.customFieldService = customFieldService;
    }

    @Override
    public ResponseEntity<CustomFieldDto> upload(OAuth2AuthenticationToken authentication, MultipartFile file) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(customFieldService.upload(currentUserResolver.resolve(authentication).userId(), file));
    }

    @Override
    public ResponseEntity<List<CustomFieldDto>> getAll(OAuth2AuthenticationToken authentication) {
        return ResponseEntity.ok(customFieldService.list(currentUserResolver.resolve(authentication).userId()));
    }

    @Override
    public ResponseEntity<List<CustomFieldDto>> getActive(OAuth2AuthenticationToken authentication) {
        return ResponseEntity.ok(customFieldService.getActive(currentUserResolver.resolve(authentication).userId()));
    }

    @Override
    public ResponseEntity<CustomFieldDto> activate(OAuth2AuthenticationToken authentication, String id) {
        return ResponseEntity.ok(customFieldService.activate(currentUserResolver.resolve(authentication).userId(), id));
    }

    @Override
    public ResponseEntity<Void> deactivate(OAuth2AuthenticationToken authentication, String id) {
        customFieldService.deactivate(currentUserResolver.resolve(authentication).userId(), id);
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<Void> deactivateAll(OAuth2AuthenticationToken authentication) {
        customFieldService.deactivateAll(currentUserResolver.resolve(authentication).userId());
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<Void> delete(OAuth2AuthenticationToken authentication, String id) {
        customFieldService.delete(currentUserResolver.resolve(authentication).userId(), id);
        return ResponseEntity.noContent().build();
    }

    @ExceptionHandler(CustomFieldNotFoundException.class)
    public ResponseEntity<ErrorDto> handleCustomFieldNotFound(
            CustomFieldNotFoundException exception,
            HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ErrorDto.of(HttpStatus.NOT_FOUND.value(), exception.getMessage(), request.getRequestURI()));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ErrorDto> handleIllegalState(
            IllegalStateException exception,
            HttpServletRequest request) {
        ErrorDto dto = new ErrorDto(
                Instant.now(),
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                exception.getMessage(),
                request.getRequestURI());
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(dto);
    }

}
