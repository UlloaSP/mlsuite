package dev.ulloasp.mlsuite.apiaccess.application.service;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.apiaccess.adapter.out.persistence.repository.ApiClientCount;
import dev.ulloasp.mlsuite.apiaccess.adapter.out.persistence.repository.ApiClientKeyRepository;
import dev.ulloasp.mlsuite.apiaccess.adapter.out.persistence.repository.ApiClientRepository;
import dev.ulloasp.mlsuite.apiaccess.adapter.out.persistence.repository.ApiKeyUsage;
import dev.ulloasp.mlsuite.apiaccess.application.dto.ApiClientDto;
import dev.ulloasp.mlsuite.apiaccess.application.dto.ApiClientKeyDto;
import dev.ulloasp.mlsuite.apiaccess.application.dto.ApiClientSummaryDto;
import dev.ulloasp.mlsuite.apiaccess.domain.model.ApiClient;
import dev.ulloasp.mlsuite.audit.application.service.AuditLogService;
import dev.ulloasp.mlsuite.audit.domain.model.AuditAction;
import dev.ulloasp.mlsuite.audit.domain.model.AuditActor;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;
import dev.ulloasp.mlsuite.user.application.service.UserLookupService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;
import lombok.RequiredArgsConstructor;

/**
 * What the services of an organization's clients share: who may read or change them, finding
 * one in the member's current organization, the shapes members read, and the audit trail of
 * every change to a client, its keys or its access.
 */
@Component
@RequiredArgsConstructor
class ApiClients {

    private static final Comparator<SchemaBookmark> BY_SCHEMA_AND_NAME = Comparator
            .comparing((SchemaBookmark bookmark) -> bookmark.getSchema().getName(), String.CASE_INSENSITIVE_ORDER)
            .thenComparing(SchemaBookmark::getName, String.CASE_INSENSITIVE_ORDER);

    private final WorkspaceAuthorizationService authorization;
    private final ApiClientRepository clientRepository;
    private final ApiClientKeyRepository keyRepository;
    private final ApiAccessBookmarks accessBookmarks;
    private final UserLookupService userLookup;
    private final AuditLogService auditLog;

    Organization readable(Long userId) {
        return authorization.requireCurrent(userId, PermissionKey.VIEW_API_ACCESS, PermissionKey.MANAGE_API_ACCESS);
    }

    Organization manageable(Long userId) {
        return authorization.requireCurrent(userId, PermissionKey.MANAGE_API_ACCESS);
    }

    ApiClient require(Organization organization, Long clientId) {
        return clientRepository.findByIdAndOrganizationId(clientId, organization.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "API client not found"));
    }

    /** A suspended client takes no new key or bookmark; its organization may still remove them. */
    void requireActive(ApiClient client) {
        if (client.isSuspended()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "The platform suspended this client, so it cannot be given new keys or bookmarks.");
        }
    }

    ApiClientDto detail(ApiClient client) {
        List<ApiClientKeyDto> keys = keyRepository.findByClientIdOrderByCreatedAtAscIdAsc(client.getId()).stream()
                .map(ApiClientKeyDto::from)
                .toList();
        List<SchemaBookmark> bookmarks = client.getBookmarks().stream().sorted(BY_SCHEMA_AND_NAME).toList();
        return new ApiClientDto(summaries(List.of(client)).get(0), keys,
                accessBookmarks.describe(client.getOrganization().getId(), bookmarks));
    }

    List<ApiClientSummaryDto> summaries(List<ApiClient> clients) {
        if (clients.isEmpty()) return List.of();
        List<Long> ids = clients.stream().map(ApiClient::getId).toList();
        Map<Long, ApiKeyUsage> keys = keyRepository.usageOf(ids).stream()
                .collect(Collectors.toMap(ApiKeyUsage::clientId, Function.identity()));
        Map<Long, Long> bookmarks = clientRepository.countBookmarks(ids).stream()
                .collect(Collectors.toMap(ApiClientCount::id, ApiClientCount::count));
        return clients.stream().map(client -> {
            ApiKeyUsage usage = keys.get(client.getId());
            return ApiClientSummaryDto.from(client, usage == null ? 0 : usage.keyCount(),
                    bookmarks.getOrDefault(client.getId(), 0L), usage == null ? null : usage.lastUsedAt());
        }).toList();
    }

    String memberName(Long userId) {
        return userLookup.requireById(userId).getFullName();
    }

    void audit(ApiClient client, Long userId, AuditAction action, Long targetId, Map<String, Object> details) {
        auditLog.record(AuditActor.user(userId), client.getOrganization().getId(), action, targetId, details);
    }
}
