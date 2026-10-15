package dev.ulloasp.mlsuite.apiaccess.adapter.in.web;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import dev.ulloasp.mlsuite.apiaccess.application.dto.ApiClientDto;
import dev.ulloasp.mlsuite.apiaccess.application.dto.ApiClientSummaryDto;
import dev.ulloasp.mlsuite.apiaccess.application.dto.CreateApiClientKeyRequest;
import dev.ulloasp.mlsuite.apiaccess.application.dto.CreateApiClientRequest;
import dev.ulloasp.mlsuite.apiaccess.application.dto.IssuedApiClientKeyDto;
import dev.ulloasp.mlsuite.apiaccess.application.dto.UpdateApiClientRequest;
import dev.ulloasp.mlsuite.apiaccess.application.port.in.ApiClientAccessUseCase;
import dev.ulloasp.mlsuite.apiaccess.application.port.in.ApiClientUseCase;
import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import dev.ulloasp.mlsuite.util.CatalogRequest;
import dev.ulloasp.mlsuite.util.PageDto;
import lombok.RequiredArgsConstructor;

/** The API clients of the member's current organization, their keys and their bookmarks. */
@RestController
@RequestMapping("/api/api-clients")
@RequiredArgsConstructor
public class ApiClientController {

    private final ApiClientUseCase clients;
    private final ApiClientAccessUseCase access;

    @GetMapping
    public PageDto<ApiClientSummaryDto> listApiClients(CurrentUser user, @ModelAttribute CatalogRequest request) {
        return clients.listClients(user.userId(), request);
    }

    @PostMapping
    public ResponseEntity<ApiClientDto> createApiClient(CurrentUser user, @RequestBody CreateApiClientRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(clients.createClient(user.userId(), request));
    }

    @GetMapping("/{clientId}")
    public ApiClientDto getApiClient(CurrentUser user, @PathVariable Long clientId) {
        return clients.getClient(user.userId(), clientId);
    }

    @PatchMapping("/{clientId}")
    public ApiClientDto updateApiClient(CurrentUser user, @PathVariable Long clientId,
            @RequestBody UpdateApiClientRequest request) {
        return clients.updateClient(user.userId(), clientId, request);
    }

    @DeleteMapping("/{clientId}")
    public ResponseEntity<Void> deleteApiClient(CurrentUser user, @PathVariable Long clientId) {
        clients.deleteClient(user.userId(), clientId);
        return ResponseEntity.noContent().build();
    }

    /** The answer carries the key's secret, which is never shown again. */
    @PostMapping("/{clientId}/keys")
    public ResponseEntity<IssuedApiClientKeyDto> issueApiClientKey(CurrentUser user, @PathVariable Long clientId,
            @RequestBody CreateApiClientKeyRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(access.issueKey(user.userId(), clientId, request));
    }

    @DeleteMapping("/{clientId}/keys/{keyId}")
    public ResponseEntity<Void> revokeApiClientKey(CurrentUser user, @PathVariable Long clientId,
            @PathVariable Long keyId) {
        access.revokeKey(user.userId(), clientId, keyId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{clientId}/bookmarks/{bookmarkId}")
    public ApiClientDto grantApiClientBookmark(CurrentUser user, @PathVariable Long clientId,
            @PathVariable Long bookmarkId) {
        return access.grantBookmark(user.userId(), clientId, bookmarkId);
    }

    @DeleteMapping("/{clientId}/bookmarks/{bookmarkId}")
    public ApiClientDto revokeApiClientBookmark(CurrentUser user, @PathVariable Long clientId,
            @PathVariable Long bookmarkId) {
        return access.revokeBookmark(user.userId(), clientId, bookmarkId);
    }
}
