package dev.ulloasp.mlsuite.schema.application.port.in;

import dev.ulloasp.mlsuite.schema.application.dto.SchemaBookmarkDto;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaChangeCatalogItemDto;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaVersionDto;
import dev.ulloasp.mlsuite.util.CatalogRequest;
import dev.ulloasp.mlsuite.util.PageDto;

/** Paged reads of what one schema holds: its snapshots, its open changes and its bookmarks. */
public interface SchemaRepositoryCatalogUseCase {

    PageDto<SchemaVersionDto> snapshots(Long userId, Long schemaId, CatalogRequest request);

    PageDto<SchemaChangeCatalogItemDto> changes(Long userId, Long schemaId, CatalogRequest request);

    PageDto<SchemaBookmarkDto> bookmarks(Long userId, Long schemaId, CatalogRequest request);
}
