package dev.ulloasp.mlsuite.customreport.controllers;

import java.time.Instant;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import dev.ulloasp.mlsuite.customreport.dtos.CustomReportDto;
import dev.ulloasp.mlsuite.customreport.exceptions.CustomReportNotFoundException;
import dev.ulloasp.mlsuite.customreport.services.CustomReportService;
import dev.ulloasp.mlsuite.user.entity.OAuthProvider;
import dev.ulloasp.mlsuite.util.ErrorDto;
import jakarta.servlet.http.HttpServletRequest;

@RestController
public class CustomReportControllerImpl implements CustomReportController {

    private final CustomReportService customReportService;

    public CustomReportControllerImpl(CustomReportService customReportService) {
        this.customReportService = customReportService;
    }

    @Override
    public ResponseEntity<CustomReportDto> upload(OAuth2AuthenticationToken authentication, MultipartFile file) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(customReportService.upload(provider(authentication), oauthId(authentication), file));
    }

    @Override
    public ResponseEntity<List<CustomReportDto>> getAll(OAuth2AuthenticationToken authentication) {
        return ResponseEntity.ok(customReportService.list(provider(authentication), oauthId(authentication)));
    }

    @Override
    public ResponseEntity<List<CustomReportDto>> getActive(OAuth2AuthenticationToken authentication) {
        return ResponseEntity.ok(customReportService.getActive(provider(authentication), oauthId(authentication)));
    }

    @Override
    public ResponseEntity<CustomReportDto> activate(OAuth2AuthenticationToken authentication, String id) {
        return ResponseEntity.ok(customReportService.activate(provider(authentication), oauthId(authentication), id));
    }

    @Override
    public ResponseEntity<Void> deactivate(OAuth2AuthenticationToken authentication, String id) {
        customReportService.deactivate(provider(authentication), oauthId(authentication), id);
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<Void> deactivateAll(OAuth2AuthenticationToken authentication) {
        customReportService.deactivateAll(provider(authentication), oauthId(authentication));
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<Void> delete(OAuth2AuthenticationToken authentication, String id) {
        customReportService.delete(provider(authentication), oauthId(authentication), id);
        return ResponseEntity.noContent().build();
    }

    @ExceptionHandler(CustomReportNotFoundException.class)
    public ResponseEntity<ErrorDto> handleCustomReportNotFound(
            CustomReportNotFoundException exception,
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

    private OAuthProvider provider(OAuth2AuthenticationToken authentication) {
        return OAuthProvider.fromString(authentication.getAuthorizedClientRegistrationId());
    }

    private String oauthId(OAuth2AuthenticationToken authentication) {
        return authentication.getPrincipal().getName();
    }
}
