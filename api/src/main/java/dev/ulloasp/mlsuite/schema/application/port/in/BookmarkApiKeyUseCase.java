package dev.ulloasp.mlsuite.schema.application.port.in;

import java.util.List;

import dev.ulloasp.mlsuite.schema.application.dto.BookmarkApiKeyDto;
import dev.ulloasp.mlsuite.schema.application.dto.CreateBookmarkApiKeyRequest;
import dev.ulloasp.mlsuite.schema.application.dto.IssuedBookmarkApiKeyDto;

/**
 * The keys outside consumers run a bookmark's model with. Members who may publish bookmarks
 * manage them, on any bookmark of their current organization; a key works only while its
 * bookmark is public.
 */
public interface BookmarkApiKeyUseCase {

    /** Oldest first. */
    List<BookmarkApiKeyDto> listKeys(Long userId, Long bookmarkId);

    /** Issues a key named after its consumer; refused when the bookmark has a key of that name. */
    IssuedBookmarkApiKeyDto createKey(Long userId, Long bookmarkId, CreateBookmarkApiKeyRequest request);

    /** Revokes the key for good; the runs made with it keep its name. */
    void revokeKey(Long userId, Long bookmarkId, Long keyId);
}
