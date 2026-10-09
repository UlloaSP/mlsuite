package dev.ulloasp.mlsuite.schema.catalog;

import dev.ulloasp.mlsuite.util.CatalogRequest;

/** A searchable option catalog; scope has the same schema/bookmark meaning as table metadata. */
public record InferenceFacetRequest(InferenceCatalogRequest scope, String kind, String search,
        Integer page, Integer size) {
    public InferenceFacetRequest {
        scope = scope == null ? new InferenceCatalogRequest(0, 24, null, null, null, null, null, null,
                null, null, null) : scope;
        var controls = new CatalogRequest(page, size, search, null, null);
        page = controls.page();
        size = controls.size();
        search = controls.search();
    }
}
