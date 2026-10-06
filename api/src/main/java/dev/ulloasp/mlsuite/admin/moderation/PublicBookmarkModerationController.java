package dev.ulloasp.mlsuite.admin.moderation;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import dev.ulloasp.mlsuite.schema.application.dto.SchemaBookmarkDto;
import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import dev.ulloasp.mlsuite.util.PageDto;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/admin/public-bookmarks")
@PreAuthorize("hasRole('SUPERADMIN')")
@RequiredArgsConstructor
public class PublicBookmarkModerationController {

    private final PublicBookmarkModerationService moderationService;

    @GetMapping
    public ResponseEntity<PageDto<ModeratedBookmarkDto>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "8") int size,
            @RequestParam(defaultValue = "") String search,
            @RequestParam(defaultValue = "updated") String sort) {
        return ResponseEntity.ok(moderationService.list(page, size, search, sort));
    }

    @PostMapping("/{bookmarkId}/unpublish")
    public ResponseEntity<SchemaBookmarkDto> unpublish(CurrentUser user, @PathVariable Long bookmarkId) {
        return ResponseEntity.ok(SchemaBookmarkDto.from(moderationService.unpublish(user.userId(), bookmarkId)));
    }
}
