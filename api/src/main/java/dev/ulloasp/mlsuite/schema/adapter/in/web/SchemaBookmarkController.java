package dev.ulloasp.mlsuite.schema.adapter.in.web;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import dev.ulloasp.mlsuite.schema.application.dto.BookmarkExampleCounts;
import dev.ulloasp.mlsuite.schema.application.dto.CreateSchemaBookmarkRequest;
import dev.ulloasp.mlsuite.schema.application.dto.MoveSchemaBookmarkRequest;
import dev.ulloasp.mlsuite.schema.application.dto.PredictBookmarkDto;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaBookmarkDto;
import dev.ulloasp.mlsuite.schema.application.port.in.SchemaBookmarkExampleUseCase;
import dev.ulloasp.mlsuite.schema.application.port.in.SchemaBookmarkUseCase;
import dev.ulloasp.mlsuite.schema.application.port.in.PredictBookmarkCatalogUseCase;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;
import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class SchemaBookmarkController {

    private final SchemaBookmarkUseCase bookmarkUseCase;
    private final PredictBookmarkCatalogUseCase predictCatalog;
    private final SchemaBookmarkExampleUseCase examples;

    @GetMapping("/schemas/{schemaId}/bookmarks")
    public ResponseEntity<List<SchemaBookmarkDto>> list(CurrentUser user,
            @PathVariable Long schemaId) {
        return ResponseEntity.ok(toDtos(bookmarkUseCase.listBookmarks(user.userId(), schemaId)));
    }

    @GetMapping("/schema-bookmarks")
    public ResponseEntity<List<PredictBookmarkDto>> listOrganization(CurrentUser user) {
        return ResponseEntity.ok(predictCatalog.listBookmarks(user.userId()));
    }

    @PostMapping("/schemas/{schemaId}/bookmarks")
    public ResponseEntity<SchemaBookmarkDto> create(CurrentUser user, @PathVariable Long schemaId,
            @Valid @RequestBody CreateSchemaBookmarkRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(toDto(
                bookmarkUseCase.createBookmark(user.userId(), schemaId, request)));
    }

    @GetMapping("/schema-bookmarks/{bookmarkId}")
    public ResponseEntity<SchemaBookmarkDto> get(CurrentUser user, @PathVariable Long bookmarkId) {
        return ResponseEntity.ok(toDto(
                bookmarkUseCase.getBookmark(user.userId(), bookmarkId)));
    }

    @PutMapping("/schema-bookmarks/{bookmarkId}")
    public ResponseEntity<SchemaBookmarkDto> move(CurrentUser user, @PathVariable Long bookmarkId,
            @Valid @RequestBody MoveSchemaBookmarkRequest request) {
        return ResponseEntity.ok(toDto(
                bookmarkUseCase.moveBookmark(user.userId(), bookmarkId, request)));
    }

    @PostMapping("/schema-bookmarks/{bookmarkId}/publish")
    public ResponseEntity<SchemaBookmarkDto> publish(CurrentUser user, @PathVariable Long bookmarkId) {
        return ResponseEntity.ok(toDto(
                bookmarkUseCase.publishBookmark(user.userId(), bookmarkId)));
    }

    @PostMapping("/schema-bookmarks/{bookmarkId}/unpublish")
    public ResponseEntity<SchemaBookmarkDto> unpublish(CurrentUser user, @PathVariable Long bookmarkId) {
        return ResponseEntity.ok(toDto(
                bookmarkUseCase.unpublishBookmark(user.userId(), bookmarkId)));
    }

    private SchemaBookmarkDto toDto(SchemaBookmark bookmark) {
        return toDtos(List.of(bookmark)).get(0);
    }

    /** One lookup of example counts for the whole response, not one per bookmark. */
    private List<SchemaBookmarkDto> toDtos(List<SchemaBookmark> bookmarks) {
        Map<Long, BookmarkExampleCounts> counts = examples.countExamples(
                bookmarks.stream().map(SchemaBookmark::getId).toList());
        return bookmarks.stream()
                .map(bookmark -> SchemaBookmarkDto.from(bookmark,
                        counts.getOrDefault(bookmark.getId(), BookmarkExampleCounts.NONE)))
                .toList();
    }
}
