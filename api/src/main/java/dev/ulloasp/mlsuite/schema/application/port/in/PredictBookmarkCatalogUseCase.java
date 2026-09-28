package dev.ulloasp.mlsuite.schema.application.port.in;

import java.util.List;

import dev.ulloasp.mlsuite.schema.application.dto.PredictBookmarkDto;

public interface PredictBookmarkCatalogUseCase {
    /** Bookmarks of every active schema in the current organization, as the Predict launcher shows them. */
    List<PredictBookmarkDto> listBookmarks(Long userId);
}
