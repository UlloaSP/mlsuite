package dev.ulloasp.mlsuite.apiaccess.application.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.apiaccess.adapter.out.persistence.repository.ApiClientRepository;
import dev.ulloasp.mlsuite.apiaccess.application.dto.ApiClientDto;
import dev.ulloasp.mlsuite.apiaccess.application.dto.ApiClientSummaryDto;
import dev.ulloasp.mlsuite.apiaccess.application.dto.CreateApiClientRequest;
import dev.ulloasp.mlsuite.apiaccess.application.dto.UpdateApiClientRequest;
import dev.ulloasp.mlsuite.apiaccess.application.port.in.ApiClientUseCase;
import dev.ulloasp.mlsuite.apiaccess.domain.model.ApiClient;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.util.CatalogRequest;
import dev.ulloasp.mlsuite.util.PageDto;
import lombok.RequiredArgsConstructor;

/**
 * Creates, names and deletes an organization's clients. Members who may view API access read
 * them; members who may manage it change them.
 */
@Service
@Transactional
@RequiredArgsConstructor
public class ApiClientService implements ApiClientUseCase {

    private final ApiClientRepository clientRepository;
    private final ApiClients clients;

    @Override
    @Transactional(readOnly = true)
    public PageDto<ApiClientSummaryDto> listClients(Long userId, CatalogRequest request) {
        Organization organization = clients.readable(userId);
        String filter = switch (request.filter()) {
            case "all", "active", "suspended" -> request.filter();
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown client filter.");
        };
        Page<ApiClient> page = clientRepository.findCatalog(organization.getId(), request.search(), filter,
                PageDto.request(request.page(), request.size(), sort(request.sort())));
        return PageDto.of(page, clients.summaries(page.getContent()));
    }

    @Override
    @Transactional(readOnly = true)
    public ApiClientDto getClient(Long userId, Long clientId) {
        return clients.detail(clients.require(clients.readable(userId), clientId));
    }

    @Override
    public ApiClientDto createClient(Long userId, CreateApiClientRequest request) {
        Organization organization = clients.manageable(userId);
        String name = name(request.name());
        if (clientRepository.existsByOrganizationIdAndNameIgnoreCase(organization.getId(), name)) {
            throw duplicate(name);
        }
        ApiClient client = clientRepository.save(new ApiClient(organization, name, description(request.description()),
                clients.memberName(userId)));
        clients.audit(client, userId, "API_CLIENT_CREATE", "API_CLIENT", client.getId(), name);
        return clients.detail(client);
    }

    @Override
    public ApiClientDto updateClient(Long userId, Long clientId, UpdateApiClientRequest request) {
        Organization organization = clients.manageable(userId);
        ApiClient client = clients.require(organization, clientId);
        String name = name(request.name());
        if (clientRepository.existsByOrganizationIdAndNameIgnoreCaseAndIdNot(organization.getId(), name, clientId)) {
            throw duplicate(name);
        }
        client.setName(name);
        client.setDescription(description(request.description()));
        clients.audit(client, userId, "API_CLIENT_UPDATE", "API_CLIENT", clientId, name);
        return clients.detail(clientRepository.saveAndFlush(client));
    }

    @Override
    public void deleteClient(Long userId, Long clientId) {
        ApiClient client = clients.require(clients.manageable(userId), clientId);
        clients.audit(client, userId, "API_CLIENT_DELETE", "API_CLIENT", clientId, client.getName());
        clientRepository.delete(client);
    }

    private static String name(String given) {
        String name = given == null ? "" : given.strip();
        if (name.isEmpty() || name.length() > ApiClient.NAME_MAX_LENGTH) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Name the client with 1 to %d characters.".formatted(ApiClient.NAME_MAX_LENGTH));
        }
        return name;
    }

    private static String description(String given) {
        String description = given == null ? "" : given.strip();
        if (description.length() > ApiClient.DESCRIPTION_MAX_LENGTH) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Describe the client in at most %d characters.".formatted(ApiClient.DESCRIPTION_MAX_LENGTH));
        }
        return description.isEmpty() ? null : description;
    }

    private static ResponseStatusException duplicate(String name) {
        return new ResponseStatusException(HttpStatus.CONFLICT,
                "This organization already has a client named \"%s\".".formatted(name));
    }

    private static Sort sort(String mode) {
        if ("name".equals(mode)) return Sort.by(Sort.Order.asc("name").ignoreCase(), Sort.Order.asc("id"));
        if ("created".equals(mode)) return Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"));
        return Sort.by(Sort.Order.desc("updatedAt"), Sort.Order.desc("id"));
    }
}
