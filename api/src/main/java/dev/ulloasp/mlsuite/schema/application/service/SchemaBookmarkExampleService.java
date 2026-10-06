package dev.ulloasp.mlsuite.schema.application.service;

import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionRunRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaBookmarkExampleRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaBookmarkRepository;
import dev.ulloasp.mlsuite.schema.application.dto.BookmarkExampleCounts;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaBookmarkExampleDto;
import dev.ulloasp.mlsuite.schema.application.port.in.SchemaBookmarkExampleUseCase;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRun;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmarkExample;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

/**
 * Curating a bookmark's public examples. A real run can hold sensitive inputs, so a run becomes an
 * example only when a member who may publish marks that one run; nothing is marked in bulk.
 */
@Service
@Transactional
@RequiredArgsConstructor
public class SchemaBookmarkExampleService implements SchemaBookmarkExampleUseCase {

    private final SchemaBookmarkRepository bookmarkRepository;
    private final PredictionRunRepository runRepository;
    private final SchemaBookmarkExampleRepository exampleRepository;
    private final WorkspaceAuthorizationService authorizationService;

    @Override
    public List<SchemaBookmarkExampleDto> listExamples(Long userId, Long bookmarkId) {
        requireBookmark(bookmarkId, organizationId(userId, PermissionKey.VIEW_MODELS));
        return exampleRepository.findByBookmarkIdOrderByCreatedAtAscIdAsc(bookmarkId).stream()
                .map(SchemaBookmarkExampleDto::from)
                .toList();
    }

    @Override
    public SchemaBookmarkExampleDto markExample(Long userId, Long bookmarkId, Long runId) {
        Long organizationId = organizationId(userId, PermissionKey.PUBLISH_BOOKMARKS);
        SchemaBookmark bookmark = requireBookmark(bookmarkId, organizationId);
        PredictionRun run = runRepository.findByIdAndOrganizationId(runId, organizationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Prediction run not found"));
        if (!run.getSchemaVersion().getSchema().getId().equals(bookmark.getSchema().getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Run outside the bookmark's schema");
        }
        SchemaBookmarkExample candidate = new SchemaBookmarkExample(bookmark, run);
        if (!candidate.isOnPinnedSnapshot()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Only runs of the snapshot the bookmark points to can be its examples");
        }
        return SchemaBookmarkExampleDto.from(exampleRepository.findByBookmarkIdAndRunId(bookmarkId, runId)
                .orElseGet(() -> exampleRepository.save(candidate)));
    }

    @Override
    public void unmarkExample(Long userId, Long bookmarkId, Long runId) {
        requireBookmark(bookmarkId, organizationId(userId, PermissionKey.PUBLISH_BOOKMARKS));
        exampleRepository.deleteByBookmarkIdAndRunId(bookmarkId, runId);
    }

    @Override
    public Map<Long, BookmarkExampleCounts> countExamples(Collection<Long> bookmarkIds) {
        Map<Long, BookmarkExampleCounts> counts = new HashMap<>();
        if (bookmarkIds.isEmpty()) return counts;
        exampleRepository.findByBookmarkIdIn(bookmarkIds).forEach(example -> counts.merge(
                example.getBookmark().getId(), BookmarkExampleCounts.of(example), BookmarkExampleCounts::plus));
        return counts;
    }

    private Long organizationId(Long userId, PermissionKey permission) {
        return authorizationService.requireCurrent(userId, permission).getId();
    }

    private SchemaBookmark requireBookmark(Long bookmarkId, Long organizationId) {
        return bookmarkRepository.findByIdAndOrganizationId(bookmarkId, organizationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Schema bookmark not found"));
    }
}
