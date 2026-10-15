package dev.ulloasp.mlsuite.apiaccess.application.dto;

import java.util.List;

/** One client with its keys, oldest first, and the bookmarks it may run. */
public record ApiClientDto(
        ApiClientSummaryDto client,
        List<ApiClientKeyDto> keys,
        List<ApiAccessBookmarkDto> bookmarks) {
}
