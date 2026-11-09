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

    public static final int DEFAULT_SIZE = 24;
    private static final int MAX_SIZE = 100;

    public static <T> PageDto<T> of(Page<?> page, List<T> items) {
        return new PageDto<>(items, page.getNumber(), page.getSize(), page.getTotalElements(), page.hasNext());
    }

    /** A requested page number: 0 or more. */
    public static int page(int page) {
        if (page < 0) {
            throw new IllegalArgumentException("Invalid page '" + page + "'; expected 0 or more");
        }
        return page;
    }

    /** A requested page size: 1 to 100. */
    public static int size(int size) {
        if (size < 1 || size > MAX_SIZE) {
            throw new IllegalArgumentException("Invalid size '" + size + "'; expected 1 to " + MAX_SIZE);
        }
        return size;
    }

    public static PageRequest request(int page, int size, Sort sort) {
        return PageRequest.of(page(page), size(size), sort);
    }
}
