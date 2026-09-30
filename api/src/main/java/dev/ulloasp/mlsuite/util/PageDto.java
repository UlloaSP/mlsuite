package dev.ulloasp.mlsuite.util;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

/** One page of a catalog listing, shared by every paginated endpoint. */
public record PageDto<T>(
        List<T> items,
        int page,
        int size,
        long totalItems,
        boolean hasNext) {

    private static final int DEFAULT_SIZE = 24;
    private static final int MAX_SIZE = 100;

    public static <T> PageDto<T> of(Page<?> page, List<T> items) {
        return new PageDto<>(items, page.getNumber(), page.getSize(), page.getTotalElements(), page.hasNext());
    }

    /** Non-positive sizes fall back to the default; large sizes are capped. */
    public static int clampSize(int size) {
        return size <= 0 ? DEFAULT_SIZE : Math.min(size, MAX_SIZE);
    }

    public static PageRequest request(int page, int size, Sort sort) {
        return PageRequest.of(Math.max(page, 0), clampSize(size), sort);
    }
}
