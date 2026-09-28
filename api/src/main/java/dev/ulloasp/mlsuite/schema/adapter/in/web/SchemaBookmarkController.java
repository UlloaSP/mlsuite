package dev.ulloasp.mlsuite.schema.adapter.in.web;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import dev.ulloasp.mlsuite.schema.application.dto.CreateSchemaBookmarkRequest;
import dev.ulloasp.mlsuite.schema.application.dto.MoveSchemaBookmarkRequest;
import dev.ulloasp.mlsuite.schema.application.dto.PredictBookmarkDto;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaBookmarkDto;
import dev.ulloasp.mlsuite.schema.application.port.in.SchemaBookmarkUseCase;
import dev.ulloasp.mlsuite.schema.application.port.in.PredictBookmarkCatalogUseCase;
import dev.ulloasp.mlsuite.security.identity.CurrentUserResolver;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api")
public class SchemaBookmarkController {

    private final CurrentUserResolver currentUserResolver;
    private final SchemaBookmarkUseCase bookmarkUseCase;
    private final PredictBookmarkCatalogUseCase predictCatalog;

    public SchemaBookmarkController(CurrentUserResolver currentUserResolver,
            SchemaBookmarkUseCase bookmarkUseCase, PredictBookmarkCatalogUseCase predictCatalog) {
        this.currentUserResolver = currentUserResolver;
        this.bookmarkUseCase = bookmarkUseCase;
        this.predictCatalog = predictCatalog;
    }

    @GetMapping("/schemas/{schemaId}/bookmarks")
    public ResponseEntity<List<SchemaBookmarkDto>> list(Authentication authentication,
            @PathVariable Long schemaId) {
        return ResponseEntity.ok(bookmarkUseCase.listBookmarks(userId(authentication), schemaId).stream()
                .map(SchemaBookmarkDto::from)
                .toList());
    }

    @GetMapping("/schema-bookmarks")
    public ResponseEntity<List<PredictBookmarkDto>> listOrganization(Authentication authentication) {
        return ResponseEntity.ok(predictCatalog.listBookmarks(userId(authentication)));
    }

    @PostMapping("/schemas/{schemaId}/bookmarks")
    public ResponseEntity<SchemaBookmarkDto> create(Authentication authentication, @PathVariable Long schemaId,
            @Valid @RequestBody CreateSchemaBookmarkRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(SchemaBookmarkDto.from(
                bookmarkUseCase.createBookmark(userId(authentication), schemaId, request)));
    }

    @GetMapping("/schema-bookmarks/{bookmarkId}")
    public ResponseEntity<SchemaBookmarkDto> get(Authentication authentication, @PathVariable Long bookmarkId) {
        return ResponseEntity.ok(SchemaBookmarkDto.from(
                bookmarkUseCase.getBookmark(userId(authentication), bookmarkId)));
    }

    @PutMapping("/schema-bookmarks/{bookmarkId}")
    public ResponseEntity<SchemaBookmarkDto> move(Authentication authentication, @PathVariable Long bookmarkId,
            @Valid @RequestBody MoveSchemaBookmarkRequest request) {
        return ResponseEntity.ok(SchemaBookmarkDto.from(
                bookmarkUseCase.moveBookmark(userId(authentication), bookmarkId, request)));
    }

    private Long userId(Authentication authentication) {
        return currentUserResolver.resolve(authentication).userId();
    }
}
