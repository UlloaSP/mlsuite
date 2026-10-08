package dev.ulloasp.mlsuite.admin.moderation;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.audit.application.service.AuditLogService;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaBookmarkRepository;
import dev.ulloasp.mlsuite.schema.domain.model.BookmarkVisibility;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;
import dev.ulloasp.mlsuite.user.application.service.UserLookupService;
import dev.ulloasp.mlsuite.util.PageDto;
import lombok.RequiredArgsConstructor;

/**
 * Platform moderation of the public surface. It reaches bookmarks of every organization, so its
 * only callers are the superadmin endpoints; members change visibility through their workspace.
 */
@Service
@Transactional
@RequiredArgsConstructor
public class PublicBookmarkModerationService {

    private final SchemaBookmarkRepository bookmarkRepository;
    private final UserLookupService userLookupService;
    private final AuditLogService auditLogService;

    @Transactional(readOnly = true)
    public PageDto<ModeratedBookmarkDto> list(int page, int size, String search, String sort) {
        Page<SchemaBookmark> bookmarks = bookmarkRepository.findPublicPage(
                search == null ? "" : search.strip(),
                PageDto.request(page, size, sort(sort)));
        return PageDto.of(bookmarks, bookmarks.getContent().stream().map(ModeratedBookmarkDto::from).toList());
    }

    /** Unpublishing a bookmark that is already private changes nothing and records nothing. */
    public SchemaBookmark unpublish(Long moderatorId, Long bookmarkId) {
        SchemaBookmark bookmark = bookmarkRepository.findById(bookmarkId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Schema bookmark not found"));
        if (bookmark.getVisibility() == BookmarkVisibility.PUBLIC) {
            bookmark.unpublish();
            auditLogService.record(
                    bookmark.getSchema().getOrganization(),
                    userLookupService.requireById(moderatorId),
                    "BOOKMARK_MODERATION_UNPUBLISH",
                    "SCHEMA_BOOKMARK",
                    bookmarkId.toString(),
                    bookmark.getName());
        }
        return bookmark;
    }

    private Sort sort(String mode) {
        if ("name".equals(mode)) return Sort.by(Sort.Order.asc("name").ignoreCase(), Sort.Order.asc("id"));
        if ("organization".equals(mode)) {
            return Sort.by(
                    Sort.Order.asc("schema.organization.name").ignoreCase(),
                    Sort.Order.asc("name").ignoreCase(),
                    Sort.Order.asc("id"));
        }
        return Sort.by(Sort.Order.desc("updatedAt"), Sort.Order.asc("id"));
    }
}
