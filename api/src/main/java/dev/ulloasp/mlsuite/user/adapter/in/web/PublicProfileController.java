package dev.ulloasp.mlsuite.user.adapter.in.web;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import dev.ulloasp.mlsuite.schema.application.dto.PublicBookmarkSummaryDto;
import dev.ulloasp.mlsuite.user.application.dto.PublicProfileDto;
import dev.ulloasp.mlsuite.user.application.port.in.PublicProfileUseCase;
import dev.ulloasp.mlsuite.util.PageDto;
import lombok.RequiredArgsConstructor;

/**
 * Open to anonymous visitors. A profile that may not be read answers a bare 404, with no body:
 * the error body echoes the path and the time, and nothing may tell one such handle from another.
 */
@RestController
@RequestMapping("/api/public/users/{handle}")
@RequiredArgsConstructor
public class PublicProfileController {

    private final PublicProfileUseCase profiles;

    @GetMapping
    public ResponseEntity<PublicProfileDto> profile(@PathVariable String handle) {
        return ResponseEntity.of(profiles.profile(handle));
    }

    @GetMapping("/bookmarks")
    public ResponseEntity<PageDto<PublicBookmarkSummaryDto>> bookmarks(
            @PathVariable String handle,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "24") int size) {
        return ResponseEntity.of(profiles.bookmarks(handle, page, size));
    }
}
