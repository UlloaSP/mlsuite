package dev.ulloasp.mlsuite.schema;

import static dev.ulloasp.mlsuite.schema.SchemaFlowFixtures.bookmark;
import static dev.ulloasp.mlsuite.schema.SchemaFlowFixtures.version;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.EnumSet;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.organization.domain.exception.OrganizationAccessDeniedException;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationMembership;
import dev.ulloasp.mlsuite.role.adapter.out.persistence.repository.RoleDefinitionRepository;
import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaBookmarkRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaModelBindingRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaVersionRepository;
import dev.ulloasp.mlsuite.schema.application.dto.CreateSchemaBookmarkRequest;
import dev.ulloasp.mlsuite.schema.application.dto.UpdateSchemaBookmarkRequest;
import dev.ulloasp.mlsuite.schema.application.service.BookmarkPublishability;
import dev.ulloasp.mlsuite.schema.application.service.SchemaBookmarkServiceImpl;
import dev.ulloasp.mlsuite.schema.domain.model.BookmarkVisibility;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaVersion;
import dev.ulloasp.mlsuite.support.TestFixtures;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;

/** A bookmark's own name and description: given when it is saved, edited afterwards. */
class BookmarkDetailsServiceTest {

    private static final long USER_ID = 3L;
    private static final long ORG_ID = 41L;
    private static final long SCHEMA_ID = 5L;
    private static final long BOOKMARK_ID = 70L;
    private static final long VERSION_ID = 9L;

    private final WorkspaceAccessService access = mock(WorkspaceAccessService.class);
    private final SchemaBookmarkRepository bookmarks = mock(SchemaBookmarkRepository.class);
    private final SchemaRepository schemas = mock(SchemaRepository.class);
    private final SchemaVersionRepository versions = mock(SchemaVersionRepository.class);
    private final Organization organization = TestFixtures.organization(ORG_ID);
    private SchemaBookmarkServiceImpl service;

    @BeforeEach
    void setUp() {
        when(access.requireCurrentOrganization(USER_ID)).thenReturn(organization);
        service = new SchemaBookmarkServiceImpl(schemas, versions, bookmarks,
                new WorkspaceAuthorizationService(access, mock(RoleDefinitionRepository.class)),
                new BookmarkPublishability(mock(SchemaModelBindingRepository.class), 50L));
        when(bookmarks.save(any(SchemaBookmark.class))).thenAnswer(call -> call.getArgument(0));
    }

    @Test
    void aNewBookmarkStoresTheDescriptionItIsSavedWith() {
        snapshot();
        memberWith(PermissionKey.CREATE_MODELS);

        SchemaBookmark described = service.createBookmark(USER_ID, SCHEMA_ID,
                new CreateSchemaBookmarkRequest(" staging ", VERSION_ID, "  Estimates risk.  "));
        SchemaBookmark blank = service.createBookmark(USER_ID, SCHEMA_ID,
                new CreateSchemaBookmarkRequest("canary", VERSION_ID, "   "));
        SchemaBookmark bare = service.createBookmark(USER_ID, SCHEMA_ID,
                new CreateSchemaBookmarkRequest("plain", VERSION_ID, null));

        assertEquals("staging", described.getName());
        assertEquals("Estimates risk.", described.getDescription());
        assertNull(blank.getDescription());
        // Nothing stands in for a missing description: the schema has one and it is not read.
        assertNull(bare.getDescription());
    }

    @Test
    void savingOverAnExistingNameKeepsItsDescriptionUnlessOneIsGiven() {
        SchemaBookmark existing = stored(described());
        snapshot();
        memberWith(PermissionKey.CREATE_MODELS);
        when(bookmarks.findBySchemaIdAndName(SCHEMA_ID, "production")).thenReturn(Optional.of(existing));

        service.createBookmark(USER_ID, SCHEMA_ID, new CreateSchemaBookmarkRequest("production", VERSION_ID, null));
        assertEquals("Estimates risk.", existing.getDescription());

        assertSame(existing, service.createBookmark(USER_ID, SCHEMA_ID,
                new CreateSchemaBookmarkRequest("production", VERSION_ID, "Estimates risk from two inputs.")));
        assertEquals("Estimates risk from two inputs.", existing.getDescription());
    }

    @Test
    void anUpdateRenamesTheBookmarkAndReplacesItsDescriptionAndNothingElse() {
        SchemaBookmark bookmark = stored(described());
        bookmark.setVisibility(BookmarkVisibility.PUBLIC);
        bookmark.setPublicId("public-1");
        SchemaVersion pinned = bookmark.getVersion();
        memberWith(PermissionKey.CREATE_MODELS);

        SchemaBookmark updated = service.updateBookmark(USER_ID, BOOKMARK_ID,
                new UpdateSchemaBookmarkRequest("  cardio-screening ", " Screens for cardiovascular risk. "));

        assertSame(bookmark, updated);
        assertEquals("cardio-screening", bookmark.getName());
        assertEquals("Screens for cardiovascular risk.", bookmark.getDescription());
        // What refers to the bookmark does so by id, and these did not move.
        assertEquals(BOOKMARK_ID, bookmark.getId());
        assertEquals("public-1", bookmark.getPublicId());
        assertEquals(BookmarkVisibility.PUBLIC, bookmark.getVisibility());
        assertSame(pinned, bookmark.getVersion());

        service.updateBookmark(USER_ID, BOOKMARK_ID, new UpdateSchemaBookmarkRequest("cardio-screening", "  "));
        assertNull(bookmark.getDescription());
    }

    @Test
    void aNameAnotherBookmarkOfTheSchemaHasIsRefused() {
        SchemaBookmark bookmark = stored(described());
        SchemaBookmark other = bookmark();
        other.setId(71L);
        memberWith(PermissionKey.CREATE_MODELS);
        when(bookmarks.findBySchemaIdAndName(SCHEMA_ID, "staging")).thenReturn(Optional.of(other));
        when(bookmarks.findBySchemaIdAndName(SCHEMA_ID, "production")).thenReturn(Optional.of(bookmark));

        ResponseStatusException refused = assertThrows(ResponseStatusException.class, () -> service.updateBookmark(
                USER_ID, BOOKMARK_ID, new UpdateSchemaBookmarkRequest("staging", "New text")));

        assertEquals(409, refused.getStatusCode().value());
        assertEquals("This schema already has a bookmark named \"staging\".", refused.getReason());
        assertEquals("production", bookmark.getName());
        assertEquals("Estimates risk.", bookmark.getDescription());
        // Keeping its own name is not a clash: only the description changes.
        service.updateBookmark(USER_ID, BOOKMARK_ID, new UpdateSchemaBookmarkRequest("production", "New text"));
        assertEquals("New text", bookmark.getDescription());
    }

    @Test
    void aBlankNameIsRefused() {
        SchemaBookmark bookmark = stored(described());
        memberWith(PermissionKey.CREATE_MODELS);

        assertEquals(400, assertThrows(ResponseStatusException.class, () -> service.updateBookmark(
                USER_ID, BOOKMARK_ID, new UpdateSchemaBookmarkRequest("  ", "New text"))).getStatusCode().value());
        assertEquals("production", bookmark.getName());
        assertEquals("Estimates risk.", bookmark.getDescription());
    }

    @Test
    void membersWhoCannotEditBookmarksCannotUpdateOne() {
        SchemaBookmark bookmark = stored(described());
        memberWith(EnumSet.complementOf(EnumSet.of(PermissionKey.CREATE_MODELS)).toArray(PermissionKey[]::new));

        assertThrows(OrganizationAccessDeniedException.class, () -> service.updateBookmark(USER_ID, BOOKMARK_ID,
                new UpdateSchemaBookmarkRequest("renamed", "New text")));
        assertEquals("production", bookmark.getName());
        verifyNoInteractions(bookmarks);
    }

    @Test
    void aBookmarkOfAnotherOrganizationIsNotFound() {
        memberWith(PermissionKey.CREATE_MODELS);
        when(bookmarks.findByIdAndOrganizationId(BOOKMARK_ID, ORG_ID)).thenReturn(Optional.empty());

        assertEquals(404, assertThrows(ResponseStatusException.class, () -> service.updateBookmark(
                USER_ID, BOOKMARK_ID, new UpdateSchemaBookmarkRequest("renamed", null))).getStatusCode().value());
    }

    private static SchemaBookmark described() {
        SchemaBookmark bookmark = bookmark();
        bookmark.getSchema().setDescription("Internal notes on the cohort.");
        bookmark.setDescription("Estimates risk.");
        return bookmark;
    }

    private SchemaBookmark stored(SchemaBookmark bookmark) {
        when(bookmarks.findByIdAndOrganizationId(BOOKMARK_ID, ORG_ID)).thenReturn(Optional.of(bookmark));
        return bookmark;
    }

    /** The schema and the snapshot a bookmark is saved on. */
    private void snapshot() {
        SchemaVersion version = version();
        version.getSchema().setDescription("Internal notes on the cohort.");
        when(schemas.findByIdAndOrganizationId(SCHEMA_ID, ORG_ID)).thenReturn(Optional.of(version.getSchema()));
        when(versions.findByIdAndOrganizationId(VERSION_ID, ORG_ID)).thenReturn(Optional.of(version));
    }

    private void memberWith(PermissionKey... permissions) {
        OrganizationMembership membership = new OrganizationMembership();
        membership.setOrganization(organization);
        membership.setRoleDefinition(TestFixtures.role(organization, null, permissions));
        when(access.requireMembership(USER_ID, ORG_ID)).thenReturn(membership);
    }
}
