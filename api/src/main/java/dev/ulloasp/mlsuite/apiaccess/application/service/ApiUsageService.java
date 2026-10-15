package dev.ulloasp.mlsuite.apiaccess.application.service;

import java.util.Set;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.apiaccess.adapter.out.persistence.repository.ApiRequestRepository;
import dev.ulloasp.mlsuite.apiaccess.application.dto.ApiRequestDto;
import dev.ulloasp.mlsuite.apiaccess.application.dto.ApiUsageDto;
import dev.ulloasp.mlsuite.apiaccess.application.port.in.ApiUsageUseCase;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.util.CatalogRequest;
import dev.ulloasp.mlsuite.util.PageDto;
import lombok.RequiredArgsConstructor;

/** The organization's request log and usage, for members who may view API access. */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class ApiUsageService implements ApiUsageUseCase {

    private static final Set<String> OUTCOMES = Set.of("all", "succeeded", "rejected", "failed", "errors");

    private final ApiRequestRepository requests;
    private final ApiUsageReader reader;
    private final ApiClients clients;

    @Override
    public PageDto<ApiRequestDto> listRequests(Long userId, Long clientId, CatalogRequest request) {
        Organization organization = clients.readable(userId);
        if (!OUTCOMES.contains(request.filter())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown request outcome.");
        }
        Page<ApiRequestDto> page = requests.findCatalog(organization.getId(), clientId, request.filter(),
                request.search(), PageRequest.of(request.page(), request.size())).map(ApiRequestDto::from);
        return PageDto.of(page, page.getContent());
    }

    @Override
    public ApiUsageDto usage(Long userId, String period, Long clientId) {
        Organization organization = clients.readable(userId);
        if (clientId != null) clients.require(organization, clientId);
        return reader.read(period, organization, clientId);
    }
}
