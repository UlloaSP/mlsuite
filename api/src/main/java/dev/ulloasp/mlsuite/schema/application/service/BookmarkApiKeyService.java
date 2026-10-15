package dev.ulloasp.mlsuite.schema.application.service;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.BookmarkApiKeyRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaBookmarkRepository;
import dev.ulloasp.mlsuite.schema.application.dto.BookmarkApiKeyDto;
import dev.ulloasp.mlsuite.schema.application.dto.CreateBookmarkApiKeyRequest;
import dev.ulloasp.mlsuite.schema.application.dto.IssuedBookmarkApiKeyDto;
import dev.ulloasp.mlsuite.schema.application.port.in.BookmarkApiKeyUseCase;
import dev.ulloasp.mlsuite.schema.domain.model.BookmarkApiKey;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;
import dev.ulloasp.mlsuite.user.application.service.UserLookupService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;
import lombok.RequiredArgsConstructor;

/**
 * Issues and revokes bookmark API keys. Keys are managed like publication, by the members who
 * may publish, and may be issued on a private bookmark ahead of publishing it: they simply do
 * not work until it is public. Unpublishing keeps them.
 */
@Service
@Transactional
@RequiredArgsConstructor
public class BookmarkApiKeyService implements BookmarkApiKeyUseCase {

    private final BookmarkApiKeyRepository keyRepository;
    private final SchemaBookmarkRepository bookmarkRepository;
    private final WorkspaceAuthorizationService authorizationService;
    private final UserLookupService userLookupService;

    @Override
    @Transactional(readOnly = true)
    public List<BookmarkApiKeyDto> listKeys(Long userId, Long bookmarkId) {
        SchemaBookmark bookmark = requireBookmark(userId, bookmarkId);
        return keyRepository.findByBookmarkIdOrderByCreatedAtAscIdAsc(bookmark.getId()).stream()
                .map(BookmarkApiKeyDto::from)
                .toList();
    }

    @Override
    public IssuedBookmarkApiKeyDto createKey(Long userId, Long bookmarkId, CreateBookmarkApiKeyRequest request) {
        SchemaBookmark bookmark = requireBookmark(userId, bookmarkId);
        String name = request.name() == null ? "" : request.name().strip();
        if (name.isEmpty() || name.length() > BookmarkApiKey.NAME_MAX_LENGTH) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Name the key with 1 to %d characters.".formatted(BookmarkApiKey.NAME_MAX_LENGTH));
        }
        if (keyRepository.existsByBookmarkIdAndNameIgnoreCase(bookmark.getId(), name)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "This bookmark already has a key named \"%s\".".formatted(name));
        }
        String secret = ApiKeySecrets.issue();
        BookmarkApiKey key = keyRepository.save(new BookmarkApiKey(bookmark, name, ApiKeySecrets.prefix(secret),
                ApiKeySecrets.hash(secret), userLookupService.requireById(userId).getFullName()));
        return new IssuedBookmarkApiKeyDto(BookmarkApiKeyDto.from(key), secret);
    }

    @Override
    public void revokeKey(Long userId, Long bookmarkId, Long keyId) {
        SchemaBookmark bookmark = requireBookmark(userId, bookmarkId);
        keyRepository.delete(keyRepository.findByIdAndBookmarkId(keyId, bookmark.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "API key not found")));
    }

    private SchemaBookmark requireBookmark(Long userId, Long bookmarkId) {
        Long orgId = authorizationService.requireCurrent(userId, PermissionKey.PUBLISH_BOOKMARKS).getId();
        return bookmarkRepository.findByIdAndOrganizationId(bookmarkId, orgId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Schema bookmark not found"));
    }
}
