package dev.ulloasp.mlsuite.schema;

import static dev.ulloasp.mlsuite.schema.SchemaFlowFixtures.bookmark;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
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
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaBookmarkRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaVersionRepository;
import dev.ulloasp.mlsuite.schema.application.dto.PublicBookmarkDto;
import dev.ulloasp.mlsuite.schema.application.service.PublicBookmarkService;
import dev.ulloasp.mlsuite.schema.application.service.SchemaBookmarkServiceImpl;
import dev.ulloasp.mlsuite.schema.domain.model.BookmarkVisibility;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;
import dev.ulloasp.mlsuite.support.TestFixtures;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;

class BookmarkPublishingServiceTest {

    private static final long USER_ID = 3L;
    private static final long ORG_ID = 41L;
    private static final long BOOKMARK_ID = 70L;

    private final WorkspaceAccessService access = mock(WorkspaceAccessService.class);
    private final SchemaBookmarkRepository bookmarks = mock(SchemaBookmarkRepository.class);
    private final RoleDefinitionRepository roles = mock(RoleDefinitionRepository.class);
    private final Organization organization = TestFixtures.organization(ORG_ID);
    private SchemaBookmarkServiceImpl service;
    private PublicBookmarkService publicService;

    @BeforeEach
    void setUp() {
        when(access.requireCurrentOrganization(USER_ID)).thenReturn(organization);
        service = new SchemaBookmarkServiceImpl(mock(SchemaRepository.class), mock(SchemaVersionRepository.class),
                bookmarks, new WorkspaceAuthorizationService(access, roles));
        publicService = new PublicBookmarkService(bookmarks);
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
        bookmark.getSchema().setDescription("Estimates cardiovascular risk.");
        bookmark.getVersion().setFormSchema(Map.of(
                "fields", List.of(
                        Map.of("kind", "number", "label", "Age", "mappedTo", Map.of("model-11", "age")),
                        Map.of("kind", "category", "label", "Smoker", "options", List.of(
                                Map.of("label", "Yes", "value", "1", "mappedTo", Map.of("model-11", "smoker__1"))))),
                "reports", List.of(Map.of("kind", "classifier", "mappedTo", Map.of("model-11", "risk")))));
        bookmark.setPublicId("public-1");
        when(bookmarks.findPublishedByPublicId("public-1")).thenReturn(Optional.of(bookmark));

        PublicBookmarkDto view = publicService.getPublishedBookmark("public-1");

        assertEquals("production", view.name());
        assertEquals("Risk", view.schemaName());
        assertEquals("Estimates cardiovascular risk.", view.schemaDescription());
        assertEquals(1, view.version());
        assertEquals("v1", view.versionName());
        assertEquals("Org", view.organizationName());
        assertEquals(Map.of("fields", List.of(
                Map.of("kind", "number", "label", "Age"),
                Map.of("kind", "category", "label", "Smoker",
                        "options", List.of(Map.of("label", "Yes", "value", "1"))))),
                view.formSchema());
        ObjectMapper mapper = new ObjectMapper().registerModule(new JavaTimeModule());
        assertEquals(Set.of("publicId", "name", "schemaName", "schemaDescription", "version", "versionName",
                "organizationName", "formSchema", "updatedAt"), mapper.convertValue(view, Map.class).keySet());
        String json = mapper.writeValueAsString(view);
        assertFalse(json.contains("model-11"));
        assertFalse(json.contains("mappedTo"));
    }

    @Test
    void aBookmarkThatIsNotPublishedIsNotFoundPublicly() {
        when(bookmarks.findPublishedByPublicId("private-or-unknown")).thenReturn(Optional.empty());

        assertEquals(404, assertThrows(ResponseStatusException.class,
                () -> publicService.getPublishedBookmark("private-or-unknown")).getStatusCode().value());
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

    private void memberWith(PermissionKey... permissions) {
        RoleDefinition role = TestFixtures.role(organization, null, permissions);
        OrganizationMembership membership = new OrganizationMembership();
        membership.setOrganization(organization);
        membership.setRoleDefinition(role);
        when(access.requireMembership(USER_ID, ORG_ID)).thenReturn(membership);
    }
}
