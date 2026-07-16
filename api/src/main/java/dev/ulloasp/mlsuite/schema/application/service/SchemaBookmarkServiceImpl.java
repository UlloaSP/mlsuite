package dev.ulloasp.mlsuite.schema.application.service;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaBookmarkRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaVersionRepository;
import dev.ulloasp.mlsuite.schema.application.dto.CreateSchemaBookmarkRequest;
import dev.ulloasp.mlsuite.schema.application.dto.MoveSchemaBookmarkRequest;
import dev.ulloasp.mlsuite.schema.application.port.in.SchemaBookmarkUseCase;
import dev.ulloasp.mlsuite.schema.domain.model.Schema;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaVersion;
import dev.ulloasp.mlsuite.user.application.service.UserLookupService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;
import jakarta.transaction.Transactional;

@Service
@Transactional
public class SchemaBookmarkServiceImpl implements SchemaBookmarkUseCase {

    private final UserLookupService userLookupService;
    private final SchemaRepository schemaRepository;
    private final SchemaVersionRepository versionRepository;
    private final SchemaBookmarkRepository bookmarkRepository;
    private final WorkspaceAccessService workspaceAccessService;
    private final WorkspaceAuthorizationService authorizationService;

    public SchemaBookmarkServiceImpl(UserLookupService userLookupService, SchemaRepository schemaRepository,
            SchemaVersionRepository versionRepository, SchemaBookmarkRepository bookmarkRepository,
            WorkspaceAccessService workspaceAccessService, WorkspaceAuthorizationService authorizationService) {
        this.userLookupService = userLookupService;
        this.schemaRepository = schemaRepository;
        this.versionRepository = versionRepository;
        this.bookmarkRepository = bookmarkRepository;
        this.workspaceAccessService = workspaceAccessService;
        this.authorizationService = authorizationService;
    }

    @Override
    public List<SchemaBookmark> listBookmarks(Long userId, Long schemaId) {
        Long orgId = requireRead(userId);
        requireSchema(schemaId, orgId);
        return bookmarkRepository.findBySchemaIdOrderByNameAsc(schemaId);
    }

    @Override
    public SchemaBookmark getBookmark(Long userId, Long bookmarkId) {
        Long orgId = requireRead(userId);
        return requireBookmark(bookmarkId, orgId);
    }

    @Override
    public SchemaBookmark createBookmark(Long userId, Long schemaId, CreateSchemaBookmarkRequest request) {
        Long orgId = requireOperate(userId);
        Schema schema = requireSchema(schemaId, orgId);
        SchemaVersion version = requireVersion(request.versionId(), orgId);
        if (!version.getSchema().getId().equals(schemaId)) throw badRequest("Bookmark version outside schema");
        String name = cleanName(request.name());
        SchemaBookmark bookmark = bookmarkRepository.findBySchemaIdAndName(schemaId, name)
                .orElseGet(() -> new SchemaBookmark(schema, version, name));
        bookmark.setVersion(version);
        return bookmarkRepository.save(bookmark);
    }

    @Override
    public SchemaBookmark moveBookmark(Long userId, Long bookmarkId, MoveSchemaBookmarkRequest request) {
        Long orgId = requireOperate(userId);
        SchemaBookmark bookmark = requireBookmark(bookmarkId, orgId);
        SchemaVersion version = requireVersion(request.versionId(), orgId);
        if (!version.getSchema().getId().equals(bookmark.getSchema().getId())) {
            throw badRequest("Bookmark version outside schema");
        }
        bookmark.setVersion(version);
        return bookmark;
    }

    private Long requireRead(Long userId) {
        userLookupService.requireById(userId);
        Long orgId = workspaceAccessService.requireCurrentOrganization(userId).getId();
        authorizationService.requireOrganizationRead(userId, orgId);
        return orgId;
    }

    private Long requireOperate(Long userId) {
        userLookupService.requireById(userId);
        Long orgId = workspaceAccessService.requireCurrentOrganization(userId).getId();
        authorizationService.requireOrganizationOperate(userId, orgId);
        return orgId;
    }

    private Schema requireSchema(Long schemaId, Long orgId) {
        return schemaRepository.findByIdAndOrganizationId(schemaId, orgId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Schema not found"));
    }

    private SchemaVersion requireVersion(Long versionId, Long orgId) {
        return versionRepository.findByIdAndOrganizationId(versionId, orgId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Schema version not found"));
    }

    private SchemaBookmark requireBookmark(Long bookmarkId, Long orgId) {
        return bookmarkRepository.findByIdAndOrganizationId(bookmarkId, orgId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Schema bookmark not found"));
    }

    private String cleanName(String value) {
        if (value == null || value.isBlank()) throw badRequest("Bookmark name is required");
        return value.trim();
    }

    private ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
