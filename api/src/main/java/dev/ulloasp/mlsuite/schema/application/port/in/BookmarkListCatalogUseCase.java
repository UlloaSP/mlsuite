package dev.ulloasp.mlsuite.schema.application.port.in;

import dev.ulloasp.mlsuite.schema.application.dto.BookmarkExampleStateDto;
import dev.ulloasp.mlsuite.schema.application.dto.PredictBookmarkDto;
import dev.ulloasp.mlsuite.schema.application.dto.PublicBookmarkExampleDto;
import dev.ulloasp.mlsuite.schema.application.dto.PublicRunDto;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaBookmarkExampleDto;
import dev.ulloasp.mlsuite.security.identity.PublicCaller;
import dev.ulloasp.mlsuite.util.CatalogRequest;
import dev.ulloasp.mlsuite.util.PageDto;

/** Paged reads of one bookmark: its examples and runs on the public page, and its examples in the workspace. */
public interface BookmarkListCatalogUseCase {

    PageDto<PublicBookmarkExampleDto> publicExamples(String publicId, CatalogRequest request);

    PageDto<PublicRunDto> publicRuns(String publicId, PublicCaller caller, CatalogRequest request);

    PageDto<SchemaBookmarkExampleDto> examples(Long userId, Long bookmarkId, CatalogRequest request);

    BookmarkExampleStateDto example(Long userId, Long bookmarkId, Long runId);

    PredictBookmarkDto statistics(Long userId, Long bookmarkId);
}
