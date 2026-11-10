package dev.ulloasp.mlsuite.util;

import java.util.List;

/**
 * Query inputs for a server-owned catalog. Missing parameters use the catalog defaults; a page or
 * size out of range is refused, and each catalog refuses a filter or sort it does not offer.
 */
public record CatalogRequest(Integer page, Integer size, String search, String filter, String sort) {

    private static final String DEFAULT_FILTER = "all";
    private static final String DEFAULT_SORT = "updated";

    public CatalogRequest {
        page = page == null ? 0 : PageDto.page(page);
        size = size == null ? PageDto.DEFAULT_SIZE : PageDto.size(size);
        search = search == null ? "" : search.strip();
        filter = filter == null ? DEFAULT_FILTER : filter;
        sort = sort == null ? DEFAULT_SORT : sort;
    }

    /** For a catalog with one fixed order: any sort but the default is refused. */
    public CatalogRequest requireOneOrder() {
        CatalogValues.require("sort", sort, List.of(DEFAULT_SORT));
        return this;
    }

    /** For a catalog that neither filters nor sorts: any filter or sort but the defaults is refused. */
    public CatalogRequest requireNoChoices() {
        CatalogValues.require("filter", filter, List.of(DEFAULT_FILTER));
        return requireOneOrder();
    }
}
