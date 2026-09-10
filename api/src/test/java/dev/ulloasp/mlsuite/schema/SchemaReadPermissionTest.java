package dev.ulloasp.mlsuite.schema;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.server.ResponseStatusException;
import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.ModelRepository;
import dev.ulloasp.mlsuite.organization.domain.exception.OrganizationAccessDeniedException;
import dev.ulloasp.mlsuite.organization.domain.model.*;
import dev.ulloasp.mlsuite.role.adapter.out.persistence.repository.RoleDefinitionRepository;
import dev.ulloasp.mlsuite.role.application.service.*;
import dev.ulloasp.mlsuite.role.domain.model.*;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.*;
import dev.ulloasp.mlsuite.schema.application.port.in.SchemaVersionUseCase;
import dev.ulloasp.mlsuite.schema.application.service.*;
import dev.ulloasp.mlsuite.schema.domain.model.*;
import dev.ulloasp.mlsuite.schema.review.adapter.out.persistence.repository.SchemaReviewRepository;
import dev.ulloasp.mlsuite.user.application.service.UserLookupService;
import dev.ulloasp.mlsuite.workspace.application.service.*;

class SchemaReadPermissionTest {
    private final WorkspaceAccessService access = mock(WorkspaceAccessService.class);
    private final UserLookupService users = mock(UserLookupService.class);
    private final SchemaRepository schemas = mock(SchemaRepository.class);
    private final SchemaVersionRepository versions = mock(SchemaVersionRepository.class);
    private final SchemaDraftRepository drafts = mock(SchemaDraftRepository.class);
    private final SchemaBookmarkRepository bookmarks = mock(SchemaBookmarkRepository.class);
    private final SchemaModelBindingRepository bindings = mock(SchemaModelBindingRepository.class);
    private final PredictionRunRepository runs = mock(PredictionRunRepository.class);
    private final PredictionResultRepository results = mock(PredictionResultRepository.class);
    private final PredictionResultFeedbackRepository feedback = mock(PredictionResultFeedbackRepository.class);
    private SchemaServiceImpl schemaService;
    private SchemaVersionServiceImpl versionService;
    private SchemaDraftServiceImpl draftService;
    private SchemaBookmarkServiceImpl bookmarkService;
    private PredictionRunServiceImpl runService;
    private PredictionResultFeedbackService feedbackService;
    private final Organization organization = new Organization();

    @BeforeEach
    void setUp() {
        organization.setId(41L);
        when(access.requireCurrentOrganization(3L)).thenReturn(organization);
        var auth = new WorkspaceAuthorizationService(access, mock(RoleDefinitionRepository.class),
                mock(RoleSeedService.class), new LegacyRolePermissionMapper());
        schemaService = new SchemaServiceImpl(users, schemas, versions, bindings, runs,
                mock(SchemaReviewRepository.class), access, auth, drafts, bookmarks);
        versionService = new SchemaVersionServiceImpl(users, schemas, versions, bindings,
                mock(ModelRepository.class), drafts, access, auth);
        draftService = new SchemaDraftServiceImpl(users, schemas, versions, drafts,
                mock(SchemaVersionUseCase.class), mock(SchemaDraftDiffService.class),
                mock(SchemaDraftPublishedVersionResolver.class), access, auth);
        bookmarkService = new SchemaBookmarkServiceImpl(users, schemas, versions, bookmarks, access, auth);
        runService = new PredictionRunServiceImpl(users, bookmarks, bindings, runs, results, feedback,
                mock(ModelRepository.class), access, auth);
        feedbackService = new PredictionResultFeedbackService(users, access, auth, results, feedback, runs);
    }

    @ParameterizedTest
    @ValueSource(strings = {"catalog", "page", "schema", "versions", "version", "bindings", "drafts", "draft",
            "bookmarks", "bookmark", "runs", "run", "organizationRuns", "feedback", "runFeedback"})
    void modelViewAllowsAllReadPathsWithoutOrganizationView(String operation) {
        membership(Set.of(PermissionKey.VIEW_MODELS));
        allowObjects();
        assertDoesNotThrow(() -> read(operation));
        verify(access).requireMembership(3L, 41L);
    }

    @ParameterizedTest
    @ValueSource(strings = {"catalog", "page", "schema", "versions", "version", "bindings", "drafts", "draft",
            "bookmarks", "bookmark", "runs", "run", "organizationRuns", "feedback", "runFeedback"})
    void organizationViewAloneDoesNotExposeMlData(String operation) {
        membership(Set.of(PermissionKey.VIEW_ORGANIZATION));
        assertThrows(OrganizationAccessDeniedException.class, () -> read(operation));
        verifyNoInteractions(schemas, versions, drafts, bookmarks, bindings, runs, results, feedback);
    }

    @ParameterizedTest
    @ValueSource(strings = {"catalog", "page", "schema", "versions", "version", "bindings", "drafts", "draft",
            "bookmarks", "bookmark", "runs", "run", "organizationRuns", "feedback", "runFeedback"})
    void nonmemberCannotReadOrganizationMlData(String operation) {
        when(access.requireMembership(3L, 41L)).thenThrow(new OrganizationAccessDeniedException(41L));
        assertThrows(OrganizationAccessDeniedException.class, () -> read(operation));
        verifyNoInteractions(schemas, versions, drafts, bookmarks, bindings, runs, results, feedback);
    }

    @ParameterizedTest
    @ValueSource(strings = {"schema", "versions", "version", "bindings", "drafts", "draft",
            "bookmarks", "bookmark", "runs", "run", "feedback", "runFeedback"})
    void resourceOutsideCurrentOrganizationIsNotFound(String operation) {
        membership(Set.of(PermissionKey.VIEW_MODELS));
        var error = assertThrows(ResponseStatusException.class, () -> read(operation));
        assertEquals(404, error.getStatusCode().value());
    }

    private void membership(Set<PermissionKey> permissions) {
        var role = new RoleDefinition();
        role.setPermissions(permissions);
        var member = new OrganizationMembership();
        member.setOrganization(organization);
        member.setRoleDefinition(role);
        when(access.requireMembership(3L, 41L)).thenReturn(member);
    }

    private void allowObjects() {
        when(schemas.findCatalogPage(eq(41L), anyString(), anyBoolean(), anyBoolean(), any(Pageable.class)))
                .thenReturn(Page.empty());
        when(schemas.findByIdAndOrganizationId(7L, 41L)).thenReturn(Optional.of(new Schema()));
        when(versions.findByIdAndOrganizationId(7L, 41L)).thenReturn(Optional.of(new SchemaVersion()));
        when(drafts.findByIdAndOrganizationId(7L, 41L)).thenReturn(Optional.of(new SchemaDraft()));
        when(bookmarks.findByIdAndOrganizationId(7L, 41L)).thenReturn(Optional.of(new SchemaBookmark()));
        when(runs.findByIdAndOrganizationId(7L, 41L)).thenReturn(Optional.of(new PredictionRun()));
        when(results.findByIdAndOrganizationId(7L, 41L)).thenReturn(Optional.of(new PredictionResult()));
        when(runs.countByIdsAndOrganizationId(List.of(7L), 41L)).thenReturn(1L);
    }

    private void read(String operation) {
        switch (operation) {
            case "catalog" -> schemaService.listSchemas(3L);
            case "page" -> schemaService.getSchemaPage(3L, 0, 24, "", "updated", "active");
            case "schema" -> schemaService.getSchema(3L, 7L);
            case "versions" -> versionService.listVersions(3L, 7L);
            case "version" -> versionService.getVersion(3L, 7L);
            case "bindings" -> versionService.listBindings(3L, 7L);
            case "drafts" -> draftService.listDrafts(3L, 7L);
            case "draft" -> draftService.getDraft(3L, 7L);
            case "bookmarks" -> bookmarkService.listBookmarks(3L, 7L);
            case "bookmark" -> bookmarkService.getBookmark(3L, 7L);
            case "runs" -> runService.listRunsForBookmark(3L, 7L);
            case "run" -> runService.getRun(3L, 7L);
            case "organizationRuns" -> runService.listOrganizationRuns(3L);
            case "feedback" -> feedbackService.listByResult(3L, 7L);
            case "runFeedback" -> feedbackService.listByRuns(3L, List.of(7L));
            default -> throw new IllegalArgumentException(operation);
        }
    }
}
