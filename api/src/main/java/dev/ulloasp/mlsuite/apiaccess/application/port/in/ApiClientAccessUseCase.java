package dev.ulloasp.mlsuite.apiaccess.application.port.in;

import java.util.List;

import dev.ulloasp.mlsuite.apiaccess.application.dto.ApiAccessBookmarkDto;
import dev.ulloasp.mlsuite.apiaccess.application.dto.ApiClientDto;
import dev.ulloasp.mlsuite.apiaccess.application.dto.CreateApiClientKeyRequest;
import dev.ulloasp.mlsuite.apiaccess.application.dto.IssuedApiClientKeyDto;

/** A client's keys and the bookmarks it may run. */
public interface ApiClientAccessUseCase {

    /** The answer carries the key's secret, which is never shown again. */
    IssuedApiClientKeyDto issueKey(Long userId, Long clientId, CreateApiClientKeyRequest request);

    void revokeKey(Long userId, Long clientId, Long keyId);

    /** Every bookmark of the organization whose schema is not archived, as the client API sees it. */
    List<ApiAccessBookmarkDto> listBookmarks(Long userId);

    ApiClientDto grantBookmark(Long userId, Long clientId, Long bookmarkId);

    ApiClientDto revokeBookmark(Long userId, Long clientId, Long bookmarkId);
}
