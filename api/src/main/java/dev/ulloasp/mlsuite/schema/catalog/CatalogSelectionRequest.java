package dev.ulloasp.mlsuite.schema.catalog;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.util.CatalogRequest;

public record CatalogSelectionRequest(
        int page,
        int size,
        String search,
        String kind,
        List<Long> ids,
        String locale,
        String timeZone) {

    public CatalogSelectionRequest {
        if (ids != null && ids.stream().anyMatch(id -> id == null || id <= 0)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid selection IDs");
        }
        ids = ids == null ? List.of() : List.copyOf(ids);
        locale = locale == null ? "en-US" : locale;
        timeZone = timeZone == null ? "UTC" : timeZone;
    }

    public CatalogRequest catalog() {
        return new CatalogRequest(page, size, search, "all", "updated");
    }
}
