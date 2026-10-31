package dev.ulloasp.mlsuite.apiaccess.application.service;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.apiaccess.adapter.out.persistence.repository.ApiClientCount;
import dev.ulloasp.mlsuite.apiaccess.adapter.out.persistence.repository.ApiClientKeyRepository;
import dev.ulloasp.mlsuite.apiaccess.adapter.out.persistence.repository.ApiClientRepository;
import dev.ulloasp.mlsuite.apiaccess.adapter.out.persistence.repository.ApiKeyUsage;
import dev.ulloasp.mlsuite.apiaccess.adapter.out.persistence.repository.ApiRequestRepository;
import dev.ulloasp.mlsuite.apiaccess.application.dto.AdminApiClientDto;
import dev.ulloasp.mlsuite.apiaccess.application.dto.AdminApiOrganizationDto;
import dev.ulloasp.mlsuite.apiaccess.application.dto.ApiCallLimitRequest;
import dev.ulloasp.mlsuite.apiaccess.application.dto.ApiUsageDto;
import dev.ulloasp.mlsuite.apiaccess.application.dto.SuspendApiClientRequest;
import dev.ulloasp.mlsuite.apiaccess.application.port.in.ApiTrafficUseCase;
import dev.ulloasp.mlsuite.apiaccess.domain.model.ApiClient;
import dev.ulloasp.mlsuite.audit.application.service.AuditLogService;
import dev.ulloasp.mlsuite.audit.domain.model.AuditAction;
import dev.ulloasp.mlsuite.audit.domain.model.AuditActor;
import dev.ulloasp.mlsuite.audit.domain.model.AuditDetails;
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationRepository;
import dev.ulloasp.mlsuite.organization.application.dto.OrganizationLogoUrl;
import dev.ulloasp.mlsuite.organization.domain.exception.OrganizationNotFoundException;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.util.CatalogRequest;
import dev.ulloasp.mlsuite.util.PageDto;
import lombok.RequiredArgsConstructor;

/** The superadmin side of API access; its controller admits superadmins alone. */
@Service
@Transactional
@RequiredArgsConstructor
public class ApiTrafficService implements ApiTrafficUseCase {

    private final ApiClientRepository clientRepository;
    private final ApiClientKeyRepository keyRepository;
    private final ApiRequestRepository requestRepository;
    private final OrganizationRepository organizationRepository;
    private final ApiUsageReader reader;
    private final ApiAccessSettings settings;
    private final AuditLogService auditLog;

    @Override
    @Transactional(readOnly = true)
    public ApiUsageDto usage(String period) {
        return reader.read(period, null, null);
    }

    @Override
    @Transactional(readOnly = true)
    public PageDto<AdminApiClientDto> listClients(CatalogRequest request) {
        String filter = switch (request.filter()) {
            case "all", "active", "suspended" -> request.filter();
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown client filter.");
        };
        Page<ApiClient> page = clientRepository.findPlatformCatalog(request.search(), filter,
                PageDto.request(request.page(), request.size(), clientSort(request.sort())));
        return PageDto.of(page, describe(page.getContent()));
    }

    @Override
    public AdminApiClientDto suspend(Long actorId, Long clientId, SuspendApiClientRequest request) {
        ApiClient client = requireClient(clientId);
        String reason = request.reason() == null ? "" : request.reason().strip();
        if (reason.isEmpty() || reason.length() > ApiClient.SUSPENSION_REASON_MAX_LENGTH) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Give the organization a reason of 1 to %d characters.".formatted(
                            ApiClient.SUSPENSION_REASON_MAX_LENGTH));
        }
        client.suspend(reason, OffsetDateTime.now());
        audit(client.getOrganization(), actorId, AuditAction.API_CLIENT_SUSPEND, clientId,
                AuditDetails.of("client", client.getName(), "reason", reason));
        return describe(List.of(clientRepository.saveAndFlush(client))).get(0);
    }

    /** Reinstating an active client changes nothing and records nothing. */
    @Override
    public AdminApiClientDto reinstate(Long actorId, Long clientId) {
        ApiClient client = requireClient(clientId);
        if (client.isSuspended()) {
            client.reinstate();
            audit(client.getOrganization(), actorId, AuditAction.API_CLIENT_REINSTATE, clientId,
                    AuditDetails.of("client", client.getName()));
            client = clientRepository.saveAndFlush(client);
        }
        return describe(List.of(client)).get(0);
    }

    @Override
    @Transactional(readOnly = true)
    public PageDto<AdminApiOrganizationDto> listOrganizations(CatalogRequest request) {
        Page<Organization> page = clientRepository.findOrganizationsWithClients(request.search(),
                PageDto.request(request.page(), request.size(),
                        Sort.by(Sort.Order.asc("name").ignoreCase(), Sort.Order.asc("id"))));
        return PageDto.of(page, describeOrganizations(page.getContent()));
    }

    @Override
    public AdminApiOrganizationDto setCallLimit(Long actorId, Long organizationId, ApiCallLimitRequest request) {
        Organization organization = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new OrganizationNotFoundException(organizationId));
        Integer limit = request.monthlyCalls();
        if (limit != null && limit < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A monthly limit cannot be negative.");
        }
        audit(organization, actorId, AuditAction.API_CALL_LIMIT_SET, organizationId,
                AuditDetails.of("monthlyCalls", AuditDetails.changed(
                        callLimit(organization.getApiMonthlyCallLimit()), callLimit(limit))));
        organization.setApiMonthlyCallLimit(limit);
        return describeOrganizations(List.of(organizationRepository.saveAndFlush(organization))).get(0);
    }

    private ApiClient requireClient(Long clientId) {
        return clientRepository.findById(clientId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "API client not found"));
    }

    private List<AdminApiClientDto> describe(List<ApiClient> clients) {
        if (clients.isEmpty()) return List.of();
        List<Long> ids = clients.stream().map(ApiClient::getId).toList();
        Map<Long, ApiKeyUsage> keys = keyRepository.usageOf(ids).stream()
                .collect(Collectors.toMap(ApiKeyUsage::clientId, Function.identity()));
        Map<Long, long[]> week = requestRepository.countByClient(ids, OffsetDateTime.now().minusDays(7)).stream()
                .collect(Collectors.toMap(row -> (Long) row[0],
                        row -> new long[] { ((Number) row[1]).longValue(), ((Number) row[2]).longValue() }));
        return clients.stream().map(client -> {
            ApiKeyUsage usage = keys.get(client.getId());
            long[] calls = week.getOrDefault(client.getId(), new long[2]);
            Organization organization = client.getOrganization();
            return new AdminApiClientDto(client.getId(), client.getName(), client.getStatus(),
                    client.getSuspensionReason(), client.getSuspendedAt(), organization.getId(), organization.getName(),
                    OrganizationLogoUrl.of(organization), usage == null ? 0 : usage.keyCount(),
                    usage == null ? null : usage.lastUsedAt(), calls[0], calls[1]);
        }).toList();
    }

    private List<AdminApiOrganizationDto> describeOrganizations(List<Organization> organizations) {
        if (organizations.isEmpty()) return List.of();
        List<Long> ids = organizations.stream().map(Organization::getId).toList();
        Map<Long, Long> clientCounts = clientRepository.countByOrganization(ids).stream()
                .collect(Collectors.toMap(ApiClientCount::id, ApiClientCount::count));
        Map<Long, Long> monthCalls = requestRepository
                .countSucceededByOrganization(ids, ApiCallLimits.monthStart(Instant.now())).stream()
                .collect(Collectors.toMap(row -> (Long) row[0], row -> ((Number) row[1]).longValue()));
        return organizations.stream().map(organization -> new AdminApiOrganizationDto(organization.getId(),
                organization.getName(), OrganizationLogoUrl.of(organization),
                clientCounts.getOrDefault(organization.getId(), 0L), monthCalls.getOrDefault(organization.getId(), 0L),
                settings.monthlyLimit(organization.getApiMonthlyCallLimit()),
                organization.getApiMonthlyCallLimit() != null)).toList();
    }

    private void audit(Organization organization, Long actorId, AuditAction action, Long targetId,
            Map<String, Object> details) {
        auditLog.record(AuditActor.user(actorId), organization.getId(), action, targetId, details);
    }

    private static String callLimit(Integer limit) {
        return limit == null ? "instance default" : limit.toString();
    }

    private static Sort clientSort(String mode) {
        if ("name".equals(mode)) return Sort.by(Sort.Order.asc("name").ignoreCase(), Sort.Order.asc("id"));
        if ("organization".equals(mode)) {
            return Sort.by(Sort.Order.asc("organization.name").ignoreCase(), Sort.Order.asc("name").ignoreCase(),
                    Sort.Order.asc("id"));
        }
        return Sort.by(Sort.Order.desc("updatedAt"), Sort.Order.desc("id"));
    }
}
