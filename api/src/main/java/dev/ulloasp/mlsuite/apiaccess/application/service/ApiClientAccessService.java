package dev.ulloasp.mlsuite.apiaccess.application.service;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.apiaccess.adapter.out.persistence.repository.ApiClientKeyRepository;
import dev.ulloasp.mlsuite.apiaccess.application.dto.ApiAccessBookmarkDto;
import dev.ulloasp.mlsuite.apiaccess.application.dto.ApiClientDto;
import dev.ulloasp.mlsuite.apiaccess.application.dto.ApiClientKeyDto;
import dev.ulloasp.mlsuite.apiaccess.application.dto.CreateApiClientKeyRequest;
import dev.ulloasp.mlsuite.apiaccess.application.dto.IssuedApiClientKeyDto;
import dev.ulloasp.mlsuite.apiaccess.application.port.in.ApiClientAccessUseCase;
import dev.ulloasp.mlsuite.apiaccess.domain.model.ApiClient;
import dev.ulloasp.mlsuite.apiaccess.domain.model.ApiClientKey;
import dev.ulloasp.mlsuite.audit.domain.model.AuditAction;
import dev.ulloasp.mlsuite.audit.domain.model.AuditDetails;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaBookmarkRepository;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;
import lombok.RequiredArgsConstructor;

/**
 * Issues and revokes a client's keys and gives it bookmarks to run or takes them away. A
 * bookmark given to a client gets the opaque id clients call it by, the same id its public page
 * uses, and runs whether or not it is public.
 */
@Service
@Transactional
@RequiredArgsConstructor
public class ApiClientAccessService implements ApiClientAccessUseCase {

    private final ApiClientKeyRepository keyRepository;
    private final SchemaBookmarkRepository bookmarkRepository;
    private final ApiAccessBookmarks accessBookmarks;
    private final ApiClients clients;

    @Override
    public IssuedApiClientKeyDto issueKey(Long userId, Long clientId, CreateApiClientKeyRequest request) {
        ApiClient client = clients.require(clients.manageable(userId), clientId);
        clients.requireActive(client);
        String name = request.name() == null ? "" : request.name().strip();
        if (name.isEmpty() || name.length() > ApiClientKey.NAME_MAX_LENGTH) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Name the key with 1 to %d characters.".formatted(ApiClientKey.NAME_MAX_LENGTH));
        }
        String secret = ApiKeySecrets.issue();
        ApiClientKey key = keyRepository.save(new ApiClientKey(client, name, ApiKeySecrets.prefix(secret),
                ApiKeySecrets.hash(secret), clients.memberName(userId)));
        clients.audit(client, userId, AuditAction.API_KEY_ISSUE, key.getId(),
                AuditDetails.of("client", client.getName(), "key", name, "prefix", key.getKeyPrefix()));
        return new IssuedApiClientKeyDto(ApiClientKeyDto.from(key), secret);
    }

    @Override
    public void revokeKey(Long userId, Long clientId, Long keyId) {
        ApiClient client = clients.require(clients.manageable(userId), clientId);
        ApiClientKey key = keyRepository.findByIdAndClientId(keyId, client.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "API key not found"));
        clients.audit(client, userId, AuditAction.API_KEY_REVOKE, keyId,
                AuditDetails.of("client", client.getName(), "key", key.getName(), "prefix", key.getKeyPrefix()));
        keyRepository.delete(key);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ApiAccessBookmarkDto> listBookmarks(Long userId) {
        Organization organization = clients.readable(userId);
        return accessBookmarks.describe(organization.getId(),
                bookmarkRepository.findActiveByOrganizationId(organization.getId()));
    }

    @Override
    public ApiClientDto grantBookmark(Long userId, Long clientId, Long bookmarkId) {
        Organization organization = clients.manageable(userId);
        ApiClient client = clients.require(organization, clientId);
        clients.requireActive(client);
        SchemaBookmark bookmark = bookmarkRepository.findActiveByIdAndOrganizationId(bookmarkId, organization.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Schema bookmark not found"));
        if (bookmark.getPublicId() == null) bookmark.setPublicId(UUID.randomUUID().toString());
        if (client.getBookmarks().add(bookmark)) {
            clients.audit(client, userId, AuditAction.API_ACCESS_GRANT, clientId,
                    AuditDetails.of("client", client.getName(), "bookmark", bookmark.getName()));
        }
        return clients.detail(client);
    }

    @Override
    public ApiClientDto revokeBookmark(Long userId, Long clientId, Long bookmarkId) {
        ApiClient client = clients.require(clients.manageable(userId), clientId);
        client.getBookmarks().stream().filter(bookmark -> bookmark.getId().equals(bookmarkId)).findFirst()
                .ifPresent(bookmark -> {
                    client.getBookmarks().remove(bookmark);
                    clients.audit(client, userId, AuditAction.API_ACCESS_REVOKE, clientId,
                            AuditDetails.of("client", client.getName(), "bookmark", bookmark.getName()));
                });
        return clients.detail(client);
    }
}
