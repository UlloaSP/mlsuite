package dev.ulloasp.mlsuite.schema.application.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.audit.application.service.AuditLogService;
import dev.ulloasp.mlsuite.audit.domain.model.AuditAction;
import dev.ulloasp.mlsuite.audit.domain.model.AuditActor;
import dev.ulloasp.mlsuite.audit.domain.model.AuditDetails;
import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionRunRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaBookmarkRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaDraftRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaModelBindingRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaVersionRepository;
import dev.ulloasp.mlsuite.schema.application.port.in.SchemaContentDeletionUseCase;
import dev.ulloasp.mlsuite.schema.domain.model.BookmarkVisibility;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaDraft;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaDraftStatus;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaVersion;
import dev.ulloasp.mlsuite.schema.review.adapter.out.persistence.repository.SchemaReviewRepository;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@Transactional
@RequiredArgsConstructor
public class SchemaContentDeletionService implements SchemaContentDeletionUseCase {

    private static final String OPEN_JOBS = "SELECT count(*) FROM prediction_job WHERE status IN ('QUEUED', 'RUNNING')";

    private final SchemaRepository schemas;
    private final SchemaVersionRepository versions;
    private final SchemaDraftRepository drafts;
    private final SchemaBookmarkRepository bookmarks;
    private final SchemaModelBindingRepository bindings;
    private final PredictionRunRepository runs;
    private final SchemaReviewRepository reviews;
    private final WorkspaceAuthorizationService authorization;
    private final AuditLogService auditLog;
    private final JdbcTemplate jdbc;

    @Override
    public void deleteDraft(Long userId, Long draftId) {
        Long organizationId = authorization.requireCurrent(userId, PermissionKey.CREATE_MODELS).getId();
        SchemaDraft draft = drafts.findForUpdate(draftId, organizationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Schema draft not found"));
        auditLog.record(AuditActor.user(userId), organizationId, AuditAction.SCHEMA_DRAFT_DELETE, draftId,
                AuditDetails.of("draft", draft.getName(), "schema", draft.getSchema().getName()));
        drafts.delete(draft);
    }

    @Override
    public void deleteBookmark(Long userId, Long bookmarkId) {
        Long organizationId = authorization.requireCurrent(userId, PermissionKey.CREATE_MODELS).getId();
        SchemaBookmark bookmark = bookmarks.findByIdAndOrganizationId(bookmarkId, organizationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Schema bookmark not found"));
        boolean published = bookmark.getVisibility() == BookmarkVisibility.PUBLIC;
        if (published) {
            authorization.require(userId, organizationId, PermissionKey.PUBLISH_BOOKMARKS);
        }
        if (jdbc.queryForObject(OPEN_JOBS + " AND schema_bookmark_id = ?", Long.class, bookmarkId) > 0) {
            throw conflict("Bulk uploads of this bookmark are still running; cancel them before deleting it.");
        }
        if (published) {
            auditLog.record(AuditActor.user(userId), organizationId, AuditAction.BOOKMARK_UNPUBLISH, bookmarkId,
                    AuditDetails.of("bookmark", bookmark.getName()));
            bookmark.unpublish();
        }
        auditLog.record(AuditActor.user(userId), organizationId, AuditAction.BOOKMARK_DELETE, bookmarkId,
                AuditDetails.of("bookmark", bookmark.getName(), "schema", bookmark.getSchema().getName(),
                        "apiClients", count("api_client_bookmark", bookmarkId),
                        "examples", count("schema_bookmark_example", bookmarkId)));
        bookmarks.delete(bookmark);
    }

    @Override
    public void deleteVersion(Long userId, Long versionId) {
        Long organizationId = authorization.requireCurrent(userId, PermissionKey.DELETE_MODELS).getId();
        SchemaVersion version = versions.findByIdAndOrganizationId(versionId, organizationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Schema version not found"));
        schemas.findForUpdate(version.getSchema().getId(), organizationId).orElseThrow();
        requireUnused(version);
        auditLog.record(AuditActor.user(userId), organizationId, AuditAction.SCHEMA_VERSION_DELETE, versionId,
                AuditDetails.of("schema", version.getSchema().getName(), "version", version.getVersion(),
                        "name", version.getName()));
        // A draft already published has done its work; its row only remembers where it came from.
        drafts.deleteAll(drafts.findByVersion(versionId));
        bindings.deleteAll(bindings.findBySchemaVersionId(versionId));
        versions.delete(version);
    }

    private void requireUnused(SchemaVersion version) {
        Long versionId = version.getId();
        long inferences = runs.countBySchemaVersionId(versionId);
        if (inferences > 0) {
            throw conflict("%d inferences ran on this snapshot, so it stays while they do.".formatted(inferences));
        }
        if (reviews.existsBySchemaVersionId(versionId)) {
            throw conflict("A review is built on this snapshot; delete the review first.");
        }
        List<SchemaBookmark> pinned = bookmarks.findByVersionId(versionId);
        if (!pinned.isEmpty()) {
            throw conflict("Pinned by %s; move or delete first.".formatted(pinned.stream()
                    .map(bookmark -> "bookmark \"" + bookmark.getName() + "\"").collect(Collectors.joining(", "))));
        }
        String openDrafts = drafts.findByVersion(versionId).stream()
                .filter(draft -> draft.getStatus() != SchemaDraftStatus.PUBLISHED)
                .map(draft -> "\"" + draft.getName() + "\"").collect(Collectors.joining(", "));
        if (!openDrafts.isEmpty()) {
            throw conflict("Changes %s start from this snapshot; delete them first.".formatted(openDrafts));
        }
        if (jdbc.queryForObject(OPEN_JOBS + " AND schema_version_id = ?", Long.class, versionId) > 0) {
            throw conflict("Bulk uploads on this snapshot are still running; cancel them first.");
        }
    }

    private long count(String table, Long bookmarkId) {
        return jdbc.queryForObject("SELECT count(*) FROM " + table + " WHERE schema_bookmark_id = ?", Long.class,
                bookmarkId);
    }

    private static ResponseStatusException conflict(String message) {
        return new ResponseStatusException(HttpStatus.CONFLICT, message);
    }
}
