package dev.ulloasp.mlsuite.schema.adapter.in.web;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import dev.ulloasp.mlsuite.schema.application.dto.SchemaBookmarkDto;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaChangeCatalogItemDto;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaVersionDto;
import dev.ulloasp.mlsuite.schema.application.port.in.SchemaRepositoryCatalogUseCase;
import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import dev.ulloasp.mlsuite.util.CatalogRequest;
import dev.ulloasp.mlsuite.util.PageDto;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class SchemaRepositoryCatalogController {
    private final SchemaRepositoryCatalogUseCase catalogs;

    @GetMapping("/api/schemas/{schemaId}/versions/catalog")
    public PageDto<SchemaVersionDto> snapshotCatalog(CurrentUser user, @PathVariable Long schemaId,
            @ModelAttribute CatalogRequest request) {
        return catalogs.snapshots(user.userId(), schemaId, request);
    }

    @GetMapping("/api/schemas/{schemaId}/drafts/catalog")
    public PageDto<SchemaChangeCatalogItemDto> changeCatalog(CurrentUser user, @PathVariable Long schemaId,
            @ModelAttribute CatalogRequest request) {
        return catalogs.changes(user.userId(), schemaId, request);
    }

    @GetMapping("/api/schemas/{schemaId}/bookmarks/catalog")
    public PageDto<SchemaBookmarkDto> schemaBookmarkCatalog(CurrentUser user, @PathVariable Long schemaId,
            @ModelAttribute CatalogRequest request) {
        return catalogs.bookmarks(user.userId(), schemaId, request);
    }
}
