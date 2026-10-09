package dev.ulloasp.mlsuite.schema;

import static dev.ulloasp.mlsuite.schema.SchemaFlowFixtures.bookmark;
import static dev.ulloasp.mlsuite.schema.SchemaFlowFixtures.version;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationRepository;
import dev.ulloasp.mlsuite.organization.domain.exception.OrganizationAccessDeniedException;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationMembership;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationRole;
import dev.ulloasp.mlsuite.role.adapter.out.persistence.repository.RoleDefinitionRepository;
import dev.ulloasp.mlsuite.role.adapter.out.persistence.repository.RoleTemplateRepository;
import dev.ulloasp.mlsuite.role.application.service.RoleSeedService;
import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.role.domain.model.RoleDefinition;
import dev.ulloasp.mlsuite.plugin.application.port.in.ListPluginRuntimeSourcesUseCase;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaBookmarkExampleRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaBookmarkRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaModelBindingRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaVersionRepository;
import dev.ulloasp.mlsuite.schema.application.dto.CreateSchemaBookmarkRequest;
import dev.ulloasp.mlsuite.schema.application.dto.MoveSchemaBookmarkRequest;
import dev.ulloasp.mlsuite.schema.application.dto.PublicBookmarkDto;
import dev.ulloasp.mlsuite.schema.application.service.BookmarkPublishability;
import dev.ulloasp.mlsuite.schema.application.service.PublicBookmarkService;
import dev.ulloasp.mlsuite.schema.application.service.SchemaBookmarkServiceImpl;
import dev.ulloasp.mlsuite.schema.domain.model.BookmarkVisibility;
import dev.ulloasp.mlsuite.schema.domain.model.BoundModel;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaVersion;
import dev.ulloasp.mlsuite.support.TestFixtures;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;

class BookmarkPublishingServiceTest {

    private static final long USER_ID = 3L;
    private static final long ORG_ID = 41L;
    private static final long BOOKMARK_ID = 70L;
    private static final long VERSION_ID = 9L;
    private static final long NEXT_VERSION_ID = 10L;
    private static final long CEILING_MB = 50L;
    private static final long MB = 1024L * 1024L;

    private final WorkspaceAccessService access = mock(WorkspaceAccessService.class);
    private final SchemaBookmarkRepository bookmarks = mock(SchemaBookmarkRepository.class);
    private final SchemaRepository schemas = mock(SchemaRepository.class);
    private final SchemaVersionRepository versions = mock(SchemaVersionRepository.class);
    private final SchemaModelBindingRepository bindings = mock(SchemaModelBindingRepository.class);
    private final RoleDefinitionRepository roles = mock(RoleDefinitionRepository.class);
    private final Organization organization = TestFixtures.organization(ORG_ID);
    private SchemaBookmarkServiceImpl service;
    private PublicBookmarkService publicService;

    @BeforeEach
    void setUp() {
        when(access.requireCurrentOrganization(USER_ID)).thenReturn(organization);
        BookmarkPublishability publishability = new BookmarkPublishability(bindings, CEILING_MB);
        service = new SchemaBookmarkServiceImpl(schemas, versions, bookmarks,
                new WorkspaceAuthorizationService(access, roles), publishability);
        publicService = new PublicBookmarkService(bookmarks, mock(SchemaBookmarkExampleRepository.class),
                publishability,
                mock(ListPluginRuntimeSourcesUseCase.class));
    }

    @Test
    void publishingAssignsAPublicIdThatSurvivesUnpublishing() {
        SchemaBookmark bookmark = stored(bookmark());
        memberWith(PermissionKey.PUBLISH_BOOKMARKS);
        assertEquals(BookmarkVisibility.PRIVATE, bookmark.getVisibility());
        assertNull(bookmark.getPublicId());

        String publicId = service.publishBookmark(USER_ID, BOOKMARK_ID).getPublicId();
        assertNotNull(publicId);
        assertEquals(BookmarkVisibility.PUBLIC, bookmark.getVisibility());

        assertEquals(BookmarkVisibility.PRIVATE, service.unpublishBookmark(USER_ID, BOOKMARK_ID).getVisibility());
        assertEquals(publicId, bookmark.getPublicId());

        assertEquals(publicId, service.publishBookmark(USER_ID, BOOKMARK_ID).getPublicId());
        assertEquals(BookmarkVisibility.PUBLIC, bookmark.getVisibility());
    }

    @Test
    void membersWithoutThePermissionCannotChangeVisibility() {
        SchemaBookmark bookmark = stored(bookmark());
        memberWith(EnumSet.complementOf(EnumSet.of(PermissionKey.PUBLISH_BOOKMARKS)).toArray(PermissionKey[]::new));

        assertThrows(OrganizationAccessDeniedException.class, () -> service.publishBookmark(USER_ID, BOOKMARK_ID));
        assertThrows(OrganizationAccessDeniedException.class, () -> service.unpublishBookmark(USER_ID, BOOKMARK_ID));
        assertEquals(BookmarkVisibility.PRIVATE, bookmark.getVisibility());
        verifyNoInteractions(bookmarks);
    }

    @Test
    void nonMembersCannotChangeVisibility() {
        when(access.requireMembership(USER_ID, ORG_ID)).thenThrow(new OrganizationAccessDeniedException(ORG_ID));

        assertThrows(OrganizationAccessDeniedException.class, () -> service.publishBookmark(USER_ID, BOOKMARK_ID));
        assertThrows(OrganizationAccessDeniedException.class, () -> service.unpublishBookmark(USER_ID, BOOKMARK_ID));
        verifyNoInteractions(bookmarks);
    }

    @Test
    void aBookmarkOfAnotherOrganizationIsNotFound() {
        memberWith(PermissionKey.PUBLISH_BOOKMARKS);
        when(bookmarks.findByIdAndOrganizationId(BOOKMARK_ID, ORG_ID)).thenReturn(Optional.empty());

        assertEquals(404, assertThrows(ResponseStatusException.class,
                () -> service.publishBookmark(USER_ID, BOOKMARK_ID)).getStatusCode().value());
        assertEquals(404, assertThrows(ResponseStatusException.class,
                () -> service.unpublishBookmark(USER_ID, BOOKMARK_ID)).getStatusCode().value());
    }

    @Test
    void thePublicViewCarriesTheFormWithoutInternalIdentifiers() throws Exception {
        SchemaBookmark bookmark = bookmark();
        bookmark.getSchema().setDescription("Internal notes on the cohort.");
        bookmark.setDescription("Estimates cardiovascular risk.");
        bookmark.getVersion().setFormSchema(Map.of(
                "fields", List.of(
                        Map.of("kind", "number", "label", "Age", "mappedTo", Map.of("model-11", "age")),
                        Map.of("kind", "number", "label", "Site", "hidden", true, "mappedTo", Map.of("model-11", "site")),
                        Map.of("kind", "category", "label", "Smoker", "options", List.of(
                                Map.of("label", "Yes", "value", "1", "mappedTo", Map.of("model-11", "smoker__1"))))),
                "reports", List.of(
                        Map.of("kind", "classifier", "label", "Risk", "mappedTo", Map.of("model-11", "risk")),
                        Map.of("kind", "regressor", "label", "Orphan", "mappedTo", Map.of("model-99", "gone")))));
        bookmark.setPublicId("public-1");
        when(bookmarks.findPublishedByPublicId("public-1")).thenReturn(Optional.of(bookmark));
        bound(VERSION_ID, new BoundModel(11L, "model-11", MB));

        PublicBookmarkDto view = publicService.getPublishedBookmark("public-1");

        assertEquals("production", view.name());
        assertEquals("Estimates cardiovascular risk.", view.description());
        assertEquals(1, view.version());
        // A hidden field stays on the server: it is neither counted nor sent with the form.
        assertEquals(2, view.inputCount());
        assertEquals(1, view.reportCount());
        assertEquals("Org", view.organizationName());
        // Opaque keys stand where the routing was; a report that no bound model produces is gone.
        assertEquals(Map.of(
                "fields", List.of(
                        Map.of("kind", "number", "label", "Age", "mappedTo", "in0"),
                        Map.of("kind", "category", "label", "Smoker",
                                "options", List.of(Map.of("label", "Yes", "value", "1", "mappedTo", "in1")))),
                "reports", List.of(
                        Map.of("kind", "classifier", "label", "Risk", "id", "out0", "mappedTo", "out0"))),
                view.formSchema());
        ObjectMapper mapper = new ObjectMapper().registerModule(new JavaTimeModule());
        assertEquals(Set.of("publicId", "name", "description", "publicationNote", "version", "inputCount",
                "reportCount", "organizationName", "organizationLogoUrl", "formSchema", "updatedAt"),
                mapper.convertValue(view, Map.class).keySet());
        String json = mapper.writeValueAsString(view);
        for (String secret : List.of("model-11", "model-99", "smoker__1", "gone", "site", "Site", "cohort")) {
            assertFalse(json.contains(secret), secret);
        }
    }

    @Test
    void aBookmarkThatIsNotPublishedIsNotFoundPublicly() {
        when(bookmarks.findPublishedByPublicId("private-or-unknown")).thenReturn(Optional.empty());

        assertEquals(404, assertThrows(ResponseStatusException.class,
                () -> publicService.getPublishedBookmark("private-or-unknown")).getStatusCode().value());
    }

    @Test
    void modelsUpToTheSizeCeilingCanBePublishedWhateverTheirFormat() {
        SchemaBookmark bookmark = stored(bookmark());
        memberWith(PermissionKey.PUBLISH_BOOKMARKS);
        bound(VERSION_ID, new BoundModel(11L, "forest.joblib", 12L), new BoundModel(12L, "net.onnx", CEILING_MB * MB));

        service.publishBookmark(USER_ID, BOOKMARK_ID);

        assertEquals(BookmarkVisibility.PUBLIC, bookmark.getVisibility());
    }

    @Test
    void aModelOverTheSizeCeilingKeepsTheBookmarkPrivateAndSaysWhy() {
        SchemaBookmark bookmark = stored(bookmark());
        memberWith(PermissionKey.PUBLISH_BOOKMARKS);
        bound(VERSION_ID, new BoundModel(11L, "small", MB), new BoundModel(12L, "huge", CEILING_MB * MB + MB / 2));

        ResponseStatusException refused = assertThrows(ResponseStatusException.class,
                () -> service.publishBookmark(USER_ID, BOOKMARK_ID));

        assertEquals(409, refused.getStatusCode().value());
        assertEquals("This bookmark cannot be published. Model \"huge\" is 50.5 MB; public bookmarks can only run "
                + "models up to 50 MB.", refused.getReason());
        assertEquals(BookmarkVisibility.PRIVATE, bookmark.getVisibility());
        assertNull(bookmark.getPublicId());
    }

    @Test
    void aModelOfUnknownSizeCannotBePublished() {
        SchemaBookmark bookmark = stored(bookmark());
        memberWith(PermissionKey.PUBLISH_BOOKMARKS);
        bound(VERSION_ID, new BoundModel(11L, "legacy", null));

        ResponseStatusException refused = assertThrows(ResponseStatusException.class,
                () -> service.publishBookmark(USER_ID, BOOKMARK_ID));

        assertEquals(409, refused.getStatusCode().value());
        assertEquals("This bookmark cannot be published. Model \"legacy\" has no recorded size, so it cannot be "
                + "checked against the 50 MB limit for public bookmarks.", refused.getReason());
        assertEquals(BookmarkVisibility.PRIVATE, bookmark.getVisibility());
    }

    @Test
    void aPublicBookmarkCannotMoveToASnapshotThatMayNotBePublic() {
        SchemaBookmark bookmark = stored(bookmark());
        bookmark.setVisibility(BookmarkVisibility.PUBLIC);
        SchemaVersion pinned = bookmark.getVersion();
        SchemaVersion next = nextVersion();
        memberWith(PermissionKey.CREATE_MODELS);
        bound(NEXT_VERSION_ID, new BoundModel(12L, "huge", CEILING_MB * MB + 1));
        when(schemas.findByIdAndOrganizationId(5L, ORG_ID)).thenReturn(Optional.of(bookmark.getSchema()));
        when(bookmarks.findBySchemaIdAndName(5L, "production")).thenReturn(Optional.of(bookmark));

        ResponseStatusException moved = assertThrows(ResponseStatusException.class,
                () -> service.moveBookmark(USER_ID, BOOKMARK_ID, new MoveSchemaBookmarkRequest(NEXT_VERSION_ID)));
        ResponseStatusException recreated = assertThrows(ResponseStatusException.class, () -> service.createBookmark(
                USER_ID, 5L, new CreateSchemaBookmarkRequest("production", NEXT_VERSION_ID, null, null)));

        for (ResponseStatusException refused : List.of(moved, recreated)) {
            assertEquals(409, refused.getStatusCode().value());
            assertEquals("This bookmark is public, so it cannot move to this snapshot until it is unpublished. "
                    + "Model \"huge\" is 50.0 MB; public bookmarks can only run models up to 50 MB.", refused.getReason());
        }
        assertSame(pinned, bookmark.getVersion());
        assertEquals(BookmarkVisibility.PUBLIC, bookmark.getVisibility());

        bound(NEXT_VERSION_ID, new BoundModel(12L, "fits", CEILING_MB * MB));
        service.moveBookmark(USER_ID, BOOKMARK_ID, new MoveSchemaBookmarkRequest(NEXT_VERSION_ID));
        assertSame(next, bookmark.getVersion());
    }

    @Test
    void aPrivateBookmarkMovesToAnySnapshot() {
        SchemaBookmark bookmark = stored(bookmark());
        SchemaVersion next = nextVersion();
        memberWith(PermissionKey.CREATE_MODELS);

        service.moveBookmark(USER_ID, BOOKMARK_ID, new MoveSchemaBookmarkRequest(NEXT_VERSION_ID));

        assertSame(next, bookmark.getVersion());
        verifyNoInteractions(bindings);
    }

    @Test
    void membersFindTheirBookmarkBehindAPublicId() {
        SchemaBookmark bookmark = bookmark();
        when(bookmarks.findByPublicIdAndOrganizationId("public-1", ORG_ID)).thenReturn(Optional.of(bookmark));
        memberWith(PermissionKey.VIEW_MODELS);

        assertSame(bookmark, service.getBookmarkByPublicId(USER_ID, "public-1"));
        // Another organization's public id is not theirs to open in a workspace.
        assertEquals(404, assertThrows(ResponseStatusException.class,
                () -> service.getBookmarkByPublicId(USER_ID, "public-of-another-organization")).getStatusCode().value());

        memberWith(PermissionKey.VIEW_ORGANIZATION);
        assertThrows(OrganizationAccessDeniedException.class, () -> service.getBookmarkByPublicId(USER_ID, "public-1"));
    }

    @ParameterizedTest
    @EnumSource(OrganizationRole.class)
    void existingOwnerAndAdminRolesGainThePermissionAtStartup(OrganizationRole role) {
        RoleDefinition existing = TestFixtures.role(organization, role.name(), PermissionKey.VIEW_MODELS);
        when(roles.findByOrganizationIdAndSystemKey(ORG_ID, role.name())).thenReturn(Optional.of(existing));
        when(roles.save(existing)).thenReturn(existing);
        var seed = new RoleSeedService(mock(OrganizationRepository.class), roles, mock(RoleTemplateRepository.class));

        boolean granted = seed.orgRole(organization, role).getPermissions().contains(PermissionKey.PUBLISH_BOOKMARKS);

        assertEquals(role == OrganizationRole.OWNER || role == OrganizationRole.ADMIN, granted);
    }

    private SchemaBookmark stored(SchemaBookmark bookmark) {
        when(bookmarks.findByIdAndOrganizationId(BOOKMARK_ID, ORG_ID)).thenReturn(Optional.of(bookmark));
        return bookmark;
    }

    private SchemaVersion nextVersion() {
        SchemaVersion next = version();
        next.setId(NEXT_VERSION_ID);
        when(versions.findByIdAndOrganizationId(NEXT_VERSION_ID, ORG_ID)).thenReturn(Optional.of(next));
        return next;
    }

    private void bound(long versionId, BoundModel... models) {
        when(bindings.findBoundModels(versionId)).thenReturn(List.of(models));
    }

    private void memberWith(PermissionKey... permissions) {
        RoleDefinition role = TestFixtures.role(organization, null, permissions);
        OrganizationMembership membership = new OrganizationMembership();
        membership.setOrganization(organization);
        membership.setRoleDefinition(role);
        when(access.requireMembership(USER_ID, ORG_ID)).thenReturn(membership);
    }
}
