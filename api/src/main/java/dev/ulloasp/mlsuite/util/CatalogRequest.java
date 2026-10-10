package dev.ulloasp.mlsuite.util;

/** Query inputs for a server-owned catalog. Missing parameters use the catalog defaults. */
public record CatalogRequest(Integer page, Integer size, String search, String filter, String sort) {

    public CatalogRequest {
        page = page == null ? 0 : Math.max(0, page);
        size = PageDto.clampSize(size == null ? 0 : size);
        search = search == null ? "" : search.strip();
        filter = filter == null ? "all" : filter;
        sort = sort == null ? "updated" : sort;
    }
}
