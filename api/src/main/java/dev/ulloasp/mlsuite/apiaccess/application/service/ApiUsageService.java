package dev.ulloasp.mlsuite.apiaccess.application.service;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.ulloasp.mlsuite.apiaccess.adapter.out.persistence.repository.ApiRequestRepository;
import dev.ulloasp.mlsuite.apiaccess.application.dto.ApiRequestDto;
import dev.ulloasp.mlsuite.apiaccess.application.dto.ApiUsageDto;
import dev.ulloasp.mlsuite.apiaccess.application.port.in.ApiUsageUseCase;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.util.CatalogRequest;
import dev.ulloasp.mlsuite.util.PageDto;
import dev.ulloasp.mlsuite.util.CatalogValues;
import lombok.RequiredArgsConstructor;

/** The organization's request log and usage, for members who may view API access. */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class ApiUsageService implements ApiUsageUseCase {

    private static final List<String> OUTCOMES = List.of("all", "succeeded", "errors", "rejected", "failed");

    private final ApiRequestRepository requests;
    private final ApiUsageReader reader;
    private final ApiClients clients;

    @Override
    public PageDto<ApiRequestDto> listRequests(Long userId, Long clientId, CatalogRequest request) {
        Organization organization = clients.readable(userId);
        CatalogValues.require("filter", request.requireOneOrder().filter(), OUTCOMES);
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
