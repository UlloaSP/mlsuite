package dev.ulloasp.mlsuite.apiaccess.application.port.in;

import dev.ulloasp.mlsuite.apiaccess.application.dto.ApiClientDto;
import dev.ulloasp.mlsuite.apiaccess.application.dto.ApiClientSummaryDto;
import dev.ulloasp.mlsuite.apiaccess.application.dto.CreateApiClientRequest;
import dev.ulloasp.mlsuite.apiaccess.application.dto.UpdateApiClientRequest;
import dev.ulloasp.mlsuite.util.CatalogRequest;
import dev.ulloasp.mlsuite.util.PageDto;

/** The clients of the member's current organization. */
public interface ApiClientUseCase {

    PageDto<ApiClientSummaryDto> listClients(Long userId, CatalogRequest request);

    ApiClientDto getClient(Long userId, Long clientId);

    ApiClientDto createClient(Long userId, CreateApiClientRequest request);

    ApiClientDto updateClient(Long userId, Long clientId, UpdateApiClientRequest request);

    /** Its keys stop working at once; its calls stay in the request log under its name. */
    void deleteClient(Long userId, Long clientId);
}
