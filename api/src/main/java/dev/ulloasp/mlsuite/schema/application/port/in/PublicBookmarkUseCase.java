package dev.ulloasp.mlsuite.schema.application.port.in;

import dev.ulloasp.mlsuite.schema.application.dto.PublicBookmarkDto;

public interface PublicBookmarkUseCase {
    /** The published bookmark behind a public id, readable without a session. */
    PublicBookmarkDto getPublishedBookmark(String publicId);
}
