package dev.ulloasp.mlsuite.schema.application.port.in;

import java.util.List;

import dev.ulloasp.mlsuite.schema.application.dto.CreateSchemaBookmarkRequest;
import dev.ulloasp.mlsuite.schema.application.dto.MoveSchemaBookmarkRequest;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;

public interface SchemaBookmarkUseCase {
    List<SchemaBookmark> listBookmarks(Long userId, Long schemaId);

    SchemaBookmark getBookmark(Long userId, Long bookmarkId);

    SchemaBookmark createBookmark(Long userId, Long schemaId, CreateSchemaBookmarkRequest request);

    SchemaBookmark moveBookmark(Long userId, Long bookmarkId, MoveSchemaBookmarkRequest request);
}
