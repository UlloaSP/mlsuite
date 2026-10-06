package dev.ulloasp.mlsuite.schema.application.port.in;

import java.util.List;

import dev.ulloasp.mlsuite.schema.application.dto.CreateSchemaBookmarkRequest;
import dev.ulloasp.mlsuite.schema.application.dto.MoveSchemaBookmarkRequest;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;

public interface SchemaBookmarkUseCase {
    List<SchemaBookmark> listBookmarks(Long userId, Long schemaId);

    SchemaBookmark getBookmark(Long userId, Long bookmarkId);

    /** The workspace bookmark behind a public id, for members of the organization that owns it. */
    SchemaBookmark getBookmarkByPublicId(Long userId, String publicId);

    SchemaBookmark createBookmark(Long userId, Long schemaId, CreateSchemaBookmarkRequest request);

    SchemaBookmark moveBookmark(Long userId, Long bookmarkId, MoveSchemaBookmarkRequest request);

    /**
     * Makes the bookmark readable at its public id, assigning that id on the first publish.
     * Refused while its snapshot may not be public.
     */
    SchemaBookmark publishBookmark(Long userId, Long bookmarkId);

    /** Makes the bookmark private again; its public id is kept for a later publish. */
    SchemaBookmark unpublishBookmark(Long userId, Long bookmarkId);
}
