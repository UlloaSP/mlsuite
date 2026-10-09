package dev.ulloasp.mlsuite.schema.application.port.in;

import java.util.List;

import dev.ulloasp.mlsuite.schema.application.dto.PredictBookmarkDto;
import dev.ulloasp.mlsuite.util.CatalogRequest;
import dev.ulloasp.mlsuite.util.PageDto;

public interface PredictBookmarkCatalogUseCase {
    /** Bookmarks of every active schema in the current organization, as the Predict launcher shows them. */
    List<PredictBookmarkDto> listBookmarks(Long userId);

    /** One page of them. {@code filter} "all" keeps every bookmark; any other keeps those left behind. */
    PageDto<PredictBookmarkDto> catalog(Long userId, CatalogRequest request);

    /** One of them; a bookmark of an archived schema or of another organization is not found. */
    PredictBookmarkDto bookmark(Long userId, Long bookmarkId);
}
