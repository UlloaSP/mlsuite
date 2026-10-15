package dev.ulloasp.mlsuite.schema.adapter.in.web;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import dev.ulloasp.mlsuite.schema.application.dto.BookmarkApiKeyDto;
import dev.ulloasp.mlsuite.schema.application.dto.CreateBookmarkApiKeyRequest;
import dev.ulloasp.mlsuite.schema.application.dto.IssuedBookmarkApiKeyDto;
import dev.ulloasp.mlsuite.schema.application.port.in.BookmarkApiKeyUseCase;
import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/schema-bookmarks/{bookmarkId}/api-keys")
@RequiredArgsConstructor
public class BookmarkApiKeyController {

    private final BookmarkApiKeyUseCase apiKeys;

    @GetMapping
    public ResponseEntity<List<BookmarkApiKeyDto>> listApiKeys(CurrentUser user, @PathVariable Long bookmarkId) {
        return ResponseEntity.ok(apiKeys.listKeys(user.userId(), bookmarkId));
    }

    /** The answer carries the key's secret, which is never shown again. */
    @PostMapping
    public ResponseEntity<IssuedBookmarkApiKeyDto> createApiKey(CurrentUser user, @PathVariable Long bookmarkId,
            @Valid @RequestBody CreateBookmarkApiKeyRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(apiKeys.createKey(user.userId(), bookmarkId, request));
    }

    @DeleteMapping("/{keyId}")
    public ResponseEntity<Void> revokeApiKey(CurrentUser user, @PathVariable Long bookmarkId, @PathVariable Long keyId) {
        apiKeys.revokeKey(user.userId(), bookmarkId, keyId);
        return ResponseEntity.noContent().build();
    }
}
