package dev.ulloasp.mlsuite.apiaccess.application.port.in;

import dev.ulloasp.mlsuite.apiaccess.application.dto.AdminApiClientDto;
import dev.ulloasp.mlsuite.apiaccess.application.dto.AdminApiOrganizationDto;
import dev.ulloasp.mlsuite.apiaccess.application.dto.ApiCallLimitRequest;
import dev.ulloasp.mlsuite.apiaccess.application.dto.ApiUsageDto;
import dev.ulloasp.mlsuite.apiaccess.application.dto.SuspendApiClientRequest;
import dev.ulloasp.mlsuite.util.CatalogRequest;
import dev.ulloasp.mlsuite.util.PageDto;

/**
 * The platform's view of every organization's API clients, for superadmins: how much they call
 * and fail, never what they send. Suspending a client and setting an organization's limit are
 * kept in that organization's audit log.
 */
public interface ApiTrafficUseCase {

    ApiUsageDto usage(String period);

    /** {@code request.filter}: {@code all}, {@code active} or {@code suspended}. */
    PageDto<AdminApiClientDto> listClients(CatalogRequest request);

    AdminApiClientDto suspend(Long actorId, Long clientId, SuspendApiClientRequest request);

    AdminApiClientDto reinstate(Long actorId, Long clientId);

    PageDto<AdminApiOrganizationDto> listOrganizations(CatalogRequest request);

    AdminApiOrganizationDto setCallLimit(Long actorId, Long organizationId, ApiCallLimitRequest request);
}
