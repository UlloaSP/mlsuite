package dev.ulloasp.mlsuite.schema.review.application.dto;

import java.util.List;

/**
 * One page of the runs a reviewer still has to submit. {@code revisionCount} and
 * {@code pendingCount} count the started and the untouched runs of the whole inbox, whatever the
 * page, search or filter.
 */
public record ReviewInboxCatalogDto(
        List<ReviewInboxItemDto> items,
        int page,
        int size,
        long totalItems,
        boolean hasNext,
        long revisionCount,
        long pendingCount) {
}
