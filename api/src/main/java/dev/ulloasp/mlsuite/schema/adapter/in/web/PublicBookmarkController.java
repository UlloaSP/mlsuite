package dev.ulloasp.mlsuite.schema.adapter.in.web;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import dev.ulloasp.mlsuite.schema.application.dto.PublicBookmarkDto;
import dev.ulloasp.mlsuite.schema.application.dto.PublicBookmarkExampleDto;
import dev.ulloasp.mlsuite.schema.application.dto.PublicBookmarkSummaryDto;
import dev.ulloasp.mlsuite.schema.application.dto.PublicPredictionDto;
import dev.ulloasp.mlsuite.schema.application.dto.PublicPredictionRequest;
import dev.ulloasp.mlsuite.schema.application.port.in.PublicBookmarkUseCase;
import dev.ulloasp.mlsuite.schema.application.port.in.PublicPredictionUseCase;
import dev.ulloasp.mlsuite.util.PageDto;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/** Open to anonymous visitors: everything under /api/public is permitted by SecurityConfig. */
@RestController
@RequestMapping("/api/public/bookmarks")
@RequiredArgsConstructor
public class PublicBookmarkController {

    private final PublicBookmarkUseCase publicBookmarks;
    private final PublicPredictionUseCase publicPredictions;

    @GetMapping
    public ResponseEntity<PageDto<PublicBookmarkSummaryDto>> list(
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "24") int size,
            @RequestParam(name = "search", defaultValue = "") String search,
            @RequestParam(name = "sort", defaultValue = "updated") String sort) {
        return ResponseEntity.ok(publicBookmarks.getPublishedBookmarkPage(page, size, search, sort));
    }

    @GetMapping("/{publicId}")
    public ResponseEntity<PublicBookmarkDto> get(@PathVariable String publicId) {
        return ResponseEntity.ok(publicBookmarks.getPublishedBookmark(publicId));
    }

    @GetMapping("/{publicId}/examples")
    public ResponseEntity<List<PublicBookmarkExampleDto>> examples(@PathVariable String publicId) {
        return ResponseEntity.ok(publicBookmarks.listPublishedExamples(publicId));
    }

    /** Runs the bookmark once and returns the result; no session is read and nothing is stored. */
    @PostMapping("/{publicId}/predictions")
    public ResponseEntity<PublicPredictionDto> runPrediction(@PathVariable String publicId,
            @Valid @RequestBody PublicPredictionRequest request) {
        return ResponseEntity.ok(publicPredictions.run(publicId, request));
    }
}
