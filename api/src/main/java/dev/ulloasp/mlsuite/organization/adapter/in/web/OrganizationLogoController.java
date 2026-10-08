package dev.ulloasp.mlsuite.organization.adapter.in.web;

import java.time.Duration;

import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import dev.ulloasp.mlsuite.organization.application.dto.OrganizationDto;
import dev.ulloasp.mlsuite.organization.application.usecase.OrganizationLogoService;
import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import lombok.RequiredArgsConstructor;

/**
 * Replacing and removing the logo need a member who may edit the organization; reading it is
 * open under /api/public, which SecurityConfig permits to anyone, because explore shows it.
 */
@RestController
@RequiredArgsConstructor
public class OrganizationLogoController {

    private final OrganizationLogoService logos;

    @PutMapping(value = "/api/organizations/{organizationId}/logo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<OrganizationDto> replace(
            CurrentUser user,
            @PathVariable Long organizationId,
            @RequestParam MultipartFile logo) {
        return ResponseEntity.ok(logos.replace(user.userId(), organizationId, logo));
    }

    @DeleteMapping("/api/organizations/{organizationId}/logo")
    public ResponseEntity<OrganizationDto> remove(CurrentUser user, @PathVariable Long organizationId) {
        return ResponseEntity.ok(logos.remove(user.userId(), organizationId));
    }

    /** The address carries the logo's version, so a browser may keep the bytes for good. */
    @GetMapping("/api/public/organizations/{organizationId}/logo")
    public ResponseEntity<byte[]> read(@PathVariable Long organizationId) {
        return logos.read(organizationId)
                .map(logo -> ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(logo.getContentType()))
                        .cacheControl(CacheControl.maxAge(Duration.ofDays(365)).cachePublic().immutable())
                        .body(logo.getContent()))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
