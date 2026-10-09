package dev.ulloasp.mlsuite.schema.adapter.in.web;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import dev.ulloasp.mlsuite.schema.application.dto.BookmarkExampleStateDto;
import dev.ulloasp.mlsuite.schema.application.dto.PredictBookmarkDto;
import dev.ulloasp.mlsuite.schema.application.dto.PublicBookmarkExampleDto;
import dev.ulloasp.mlsuite.schema.application.dto.PublicRunDto;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaBookmarkExampleDto;
import dev.ulloasp.mlsuite.schema.application.port.in.BookmarkListCatalogUseCase;
import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import dev.ulloasp.mlsuite.security.identity.PublicCaller;
import dev.ulloasp.mlsuite.util.CatalogRequest;
import dev.ulloasp.mlsuite.util.PageDto;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class BookmarkListCatalogController {
    private final BookmarkListCatalogUseCase catalogs;

    @GetMapping("/api/public/bookmarks/{id}/examples/catalog")
    public PageDto<PublicBookmarkExampleDto> publicExampleCatalog(@PathVariable String id,
            @ModelAttribute CatalogRequest request) {
        return catalogs.publicExamples(id, request);
    }

    @GetMapping("/api/public/bookmarks/{id}/runs/catalog")
    public PageDto<PublicRunDto> publicRunCatalog(@PathVariable String id, PublicCaller caller,
            @ModelAttribute CatalogRequest request) {
        return catalogs.publicRuns(id, caller, request);
    }

    @GetMapping("/api/schema-bookmarks/{id}/examples/catalog")
    public PageDto<SchemaBookmarkExampleDto> bookmarkExampleCatalog(@PathVariable Long id, CurrentUser user,
            @ModelAttribute CatalogRequest request) {
        return catalogs.examples(user.userId(), id, request);
    }

    @GetMapping("/api/schema-bookmarks/{id}/examples/{runId}/status")
    public BookmarkExampleStateDto bookmarkExampleStatus(@PathVariable Long id, @PathVariable Long runId,
            CurrentUser user) {
        return catalogs.example(user.userId(), id, runId);
    }

    @GetMapping("/api/schema-bookmarks/{id}/statistics")
    public PredictBookmarkDto bookmarkStatistics(@PathVariable Long id, CurrentUser user) {
        return catalogs.statistics(user.userId(), id);
    }
}
