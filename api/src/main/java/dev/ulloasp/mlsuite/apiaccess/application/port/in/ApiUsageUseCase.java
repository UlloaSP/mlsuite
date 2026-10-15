package dev.ulloasp.mlsuite.apiaccess.application.port.in;

import dev.ulloasp.mlsuite.apiaccess.application.dto.ApiRequestDto;
import dev.ulloasp.mlsuite.apiaccess.application.dto.ApiUsageDto;
import dev.ulloasp.mlsuite.util.CatalogRequest;
import dev.ulloasp.mlsuite.util.PageDto;

/** The calls the clients of the member's current organization made. */
public interface ApiUsageUseCase {

    /**
     * The request log, newest first. {@code request.filter} is the outcome: {@code all},
     * {@code succeeded}, {@code rejected}, {@code failed} or {@code errors}; {@code clientId}
     * narrows it to one client.
     */
    PageDto<ApiRequestDto> listRequests(Long userId, Long clientId, CatalogRequest request);

    /** {@code period} is {@code day}, {@code week} or {@code month}. */
    ApiUsageDto usage(Long userId, String period, Long clientId);
}
