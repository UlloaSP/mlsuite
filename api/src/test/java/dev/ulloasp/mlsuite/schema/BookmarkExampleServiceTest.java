package dev.ulloasp.mlsuite.schema;

import static dev.ulloasp.mlsuite.schema.BookmarkExampleFixtures.bulkRunInputs;
import static dev.ulloasp.mlsuite.schema.BookmarkExampleFixtures.formRunInputs;
import static dev.ulloasp.mlsuite.schema.BookmarkExampleFixtures.nextVersion;
import static dev.ulloasp.mlsuite.schema.BookmarkExampleFixtures.run;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.databind.ObjectMapper;

import dev.ulloasp.mlsuite.organization.domain.exception.OrganizationAccessDeniedException;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationMembership;
import dev.ulloasp.mlsuite.role.adapter.out.persistence.repository.RoleDefinitionRepository;
import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionRunRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaBookmarkExampleRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaBookmarkRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaVersionRepository;
import dev.ulloasp.mlsuite.schema.application.dto.BookmarkExampleCounts;
import dev.ulloasp.mlsuite.schema.application.dto.MoveSchemaBookmarkRequest;
import dev.ulloasp.mlsuite.schema.application.dto.PublicBookmarkExampleDto;
import dev.ulloasp.mlsuite.schema.application.dto.SchemaBookmarkExampleDto;
import dev.ulloasp.mlsuite.schema.application.service.PublicBookmarkService;
import dev.ulloasp.mlsuite.schema.application.service.SchemaBookmarkExampleService;
import dev.ulloasp.mlsuite.schema.application.service.SchemaBookmarkServiceImpl;
import dev.ulloasp.mlsuite.schema.domain.model.BookmarkExampleStatus;
import dev.ulloasp.mlsuite.schema.domain.model.BookmarkVisibility;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRun;
import dev.ulloasp.mlsuite.schema.domain.model.Schema;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmarkExample;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaVersion;
import dev.ulloasp.mlsuite.support.TestFixtures;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;

class BookmarkExampleServiceTest {

    private static final long USER_ID = 3L;
    private static final long ORG_ID = 41L;
    private static final long BOOKMARK_ID = 70L;
    private static final long RUN_ID = 500L;
    private static final String PUBLIC_ID = "public-1";

    private final WorkspaceAccessService access = mock(WorkspaceAccessService.class);
    private final SchemaBookmarkRepository bookmarks = mock(SchemaBookmarkRepository.class);
    private final SchemaVersionRepository versions = mock(SchemaVersionRepository.class);
    private final PredictionRunRepository runs = mock(PredictionRunRepository.class);
    private final SchemaBookmarkExampleRepository examples = mock(SchemaBookmarkExampleRepository.class);
    private final Organization organization = TestFixtures.organization(ORG_ID);
    private final SchemaBookmark bookmark = BookmarkExampleFixtures.bookmark();
    private List<SchemaBookmarkExample> stored;
    private SchemaBookmarkExampleService service;
    private SchemaBookmarkServiceImpl bookmarkService;
    private PublicBookmarkService publicService;

    @BeforeEach
    void setUp() {
        when(access.requireCurrentOrganization(USER_ID)).thenReturn(organization);
        var authorization = new WorkspaceAuthorizationService(access, mock(RoleDefinitionRepository.class));
        stored = BookmarkExampleFixtures.stored(examples);
        service = new SchemaBookmarkExampleService(bookmarks, runs, examples, authorization);
        bookmarkService = new SchemaBookmarkServiceImpl(mock(SchemaRepository.class), versions, bookmarks,
                authorization);
        publicService = new PublicBookmarkService(bookmarks, examples);
        bookmark.setPublicId(PUBLIC_ID);
        when(bookmarks.findByIdAndOrganizationId(BOOKMARK_ID, ORG_ID)).thenReturn(Optional.of(bookmark));
        // The public lookup answers only while the bookmark is published, as the query does.
        when(bookmarks.findPublishedByPublicId(PUBLIC_ID)).thenAnswer(call ->
                bookmark.getVisibility() == BookmarkVisibility.PUBLIC ? Optional.of(bookmark) : Optional.empty());
        memberWith(PermissionKey.VIEW_MODELS, PermissionKey.CREATE_MODELS, PermissionKey.PUBLISH_BOOKMARKS);
    }

    @Test
    void markingAndUnmarkingMoveARunInAndOutOfTheBookmarksExamples() {
        storedRun(RUN_ID, bookmark.getVersion(), "Typical case", formRunInputs());

        SchemaBookmarkExampleDto marked = service.markExample(USER_ID, BOOKMARK_ID, RUN_ID);
        assertEquals(new SchemaBookmarkExampleDto(RUN_ID, "Typical case", 1, "v1",
                BookmarkExampleStatus.BOOKMARK_PRIVATE), marked);
        assertEquals(List.of(marked), service.listExamples(USER_ID, BOOKMARK_ID));

        // Marking again is not a second example.
        assertEquals(marked, service.markExample(USER_ID, BOOKMARK_ID, RUN_ID));
        assertEquals(1, stored.size());

        service.unmarkExample(USER_ID, BOOKMARK_ID, RUN_ID);
        assertEquals(List.of(), service.listExamples(USER_ID, BOOKMARK_ID));
        assertDoesNotThrow(() -> service.unmarkExample(USER_ID, BOOKMARK_ID, RUN_ID));
    }

    @Test
    void anExampleIsServedOnlyWhileItsBookmarkIsPublic() {
        storedRun(RUN_ID, bookmark.getVersion(), "Typical case", formRunInputs());
        service.markExample(USER_ID, BOOKMARK_ID, RUN_ID);

        assertEquals(404, assertThrows(ResponseStatusException.class,
                () -> publicService.listPublishedExamples(PUBLIC_ID)).getStatusCode().value());

        bookmarkService.publishBookmark(USER_ID, BOOKMARK_ID);
        assertEquals(BookmarkExampleStatus.SERVED, service.listExamples(USER_ID, BOOKMARK_ID).get(0).status());
        assertEquals(1, publicService.listPublishedExamples(PUBLIC_ID).size());

        bookmarkService.unpublishBookmark(USER_ID, BOOKMARK_ID);
        assertEquals(BookmarkExampleStatus.BOOKMARK_PRIVATE,
                service.listExamples(USER_ID, BOOKMARK_ID).get(0).status());
        assertThrows(ResponseStatusException.class, () -> publicService.listPublishedExamples(PUBLIC_ID));
    }

    @Test
    void membersWithoutThePublishPermissionSeeExamplesButCannotChangeThem() {
        storedRun(RUN_ID, bookmark.getVersion(), "Typical case", formRunInputs());
        service.markExample(USER_ID, BOOKMARK_ID, RUN_ID);
        memberWith(EnumSet.complementOf(EnumSet.of(PermissionKey.PUBLISH_BOOKMARKS)).toArray(PermissionKey[]::new));

        assertThrows(OrganizationAccessDeniedException.class,
                () -> service.markExample(USER_ID, BOOKMARK_ID, RUN_ID));
        assertThrows(OrganizationAccessDeniedException.class,
                () -> service.unmarkExample(USER_ID, BOOKMARK_ID, RUN_ID));
        assertEquals(1, service.listExamples(USER_ID, BOOKMARK_ID).size());
        assertEquals(1, stored.size());
    }

    @Test
    void nonMembersCannotReadOrChangeExamples() {
        when(access.requireMembership(USER_ID, ORG_ID)).thenThrow(new OrganizationAccessDeniedException(ORG_ID));

        assertThrows(OrganizationAccessDeniedException.class, () -> service.listExamples(USER_ID, BOOKMARK_ID));
        assertThrows(OrganizationAccessDeniedException.class,
                () -> service.markExample(USER_ID, BOOKMARK_ID, RUN_ID));
        assertThrows(OrganizationAccessDeniedException.class,
                () -> service.unmarkExample(USER_ID, BOOKMARK_ID, RUN_ID));
    }

    @Test
    void aBookmarkOrRunOfAnotherOrganizationIsNotFound() {
        assertEquals(404, status(() -> service.markExample(USER_ID, BOOKMARK_ID, RUN_ID)));

        storedRun(RUN_ID, bookmark.getVersion(), "Typical case", formRunInputs());
        when(bookmarks.findByIdAndOrganizationId(BOOKMARK_ID, ORG_ID)).thenReturn(Optional.empty());
        assertEquals(404, status(() -> service.markExample(USER_ID, BOOKMARK_ID, RUN_ID)));
        assertEquals(404, status(() -> service.unmarkExample(USER_ID, BOOKMARK_ID, RUN_ID)));
        assertEquals(404, status(() -> service.listExamples(USER_ID, BOOKMARK_ID)));
        assertTrue(stored.isEmpty());
    }

    @Test
    void onlyRunsOfTheSameSchemaOnThePinnedSnapshotCanBeMarked() {
        storedRun(RUN_ID, nextVersion(bookmark), "Other snapshot", formRunInputs());
        assertEquals(409, status(() -> service.markExample(USER_ID, BOOKMARK_ID, RUN_ID)));

        Schema otherSchema = SchemaFlowFixtures.schema();
        otherSchema.setId(6L);
        SchemaVersion foreign = new SchemaVersion(otherSchema, 1, "v1", Map.of());
        foreign.setId(bookmark.getVersion().getId());
        storedRun(RUN_ID, foreign, "Other schema", formRunInputs());
        assertEquals(400, status(() -> service.markExample(USER_ID, BOOKMARK_ID, RUN_ID)));
        assertTrue(stored.isEmpty());
    }

    @Test
    void movingTheBookmarkStopsServingItsExamplesWithoutRewritingThem() {
        bookmarkService.publishBookmark(USER_ID, BOOKMARK_ID);
        SchemaVersion first = bookmark.getVersion();
        SchemaVersion second = nextVersion(bookmark);
        when(versions.findByIdAndOrganizationId(first.getId(), ORG_ID)).thenReturn(Optional.of(first));
        when(versions.findByIdAndOrganizationId(second.getId(), ORG_ID)).thenReturn(Optional.of(second));
        storedRun(RUN_ID, first, "On v1", formRunInputs());
        service.markExample(USER_ID, BOOKMARK_ID, RUN_ID);
        assertEquals(List.of("On v1"), publicNames());
        assertEquals(new BookmarkExampleCounts(1, 0), counts());

        bookmarkService.moveBookmark(USER_ID, BOOKMARK_ID, new MoveSchemaBookmarkRequest(second.getId()));

        assertEquals(List.of(), publicNames());
        assertEquals(BookmarkExampleStatus.BOOKMARK_MOVED, service.listExamples(USER_ID, BOOKMARK_ID).get(0).status());
        assertEquals(new BookmarkExampleCounts(0, 1), counts());
        assertEquals(1, stored.size());
        assertEquals(409, status(() -> service.markExample(USER_ID, BOOKMARK_ID, RUN_ID)));

        storedRun(RUN_ID + 1, second, "On v2", bulkRunInputs());
        service.markExample(USER_ID, BOOKMARK_ID, RUN_ID + 1);
        assertEquals(List.of("On v2"), publicNames());
        assertEquals(new BookmarkExampleCounts(1, 1), counts());

        // The stale example was never rewritten, so moving back serves it again.
        bookmarkService.moveBookmark(USER_ID, BOOKMARK_ID, new MoveSchemaBookmarkRequest(first.getId()));
        assertEquals(List.of("On v1"), publicNames());
    }

    @Test
    void aPublicExampleCarriesOnlyTheVisibleFormValues() throws Exception {
        bookmarkService.publishBookmark(USER_ID, BOOKMARK_ID);
        storedRun(RUN_ID, bookmark.getVersion(), "From the form", formRunInputs());
        storedRun(RUN_ID + 1, bookmark.getVersion(), "From a bulk upload", bulkRunInputs());
        service.markExample(USER_ID, BOOKMARK_ID, RUN_ID);
        service.markExample(USER_ID, BOOKMARK_ID, RUN_ID + 1);

        List<PublicBookmarkExampleDto> served = publicService.listPublishedExamples(PUBLIC_ID);

        assertEquals(List.of("From the form", "From a bulk upload"),
                served.stream().map(PublicBookmarkExampleDto::name).toList());
        // Hidden and blank fields, model features, and keys the form no longer has stay behind.
        assertEquals(Map.of("Age", 52, "smoker", "yes", "Sex", "F"), served.get(0).inputs());
        // Bulk runs store model features only; each field finds its value through its routing.
        assertEquals(Map.of("Age", 61, "smoker", "no", "Sex", "M"), served.get(1).inputs());
        assertEquals(stored.get(0).getPublicId(), served.get(0).id());

        ObjectMapper mapper = new ObjectMapper();
        assertEquals(Set.of("id", "name", "inputs"), mapper.convertValue(served.get(0), Map.class).keySet());
        String json = mapper.writeValueAsString(served);
        for (String secret : List.of("Alice", "alice.owner@example.test", BookmarkExampleFixtures.MODEL_FEATURE,
                "model-11", "do not publish", "left over")) {
            assertFalse(json.contains(secret), secret);
        }
    }

    private PredictionRun storedRun(Long id, SchemaVersion version, String name, Map<String, Object> inputs) {
        PredictionRun run = run(id, bookmark, version, name, inputs);
        when(runs.findByIdAndOrganizationId(id, ORG_ID)).thenReturn(Optional.of(run));
        return run;
    }

    private List<String> publicNames() {
        return publicService.listPublishedExamples(PUBLIC_ID).stream().map(PublicBookmarkExampleDto::name).toList();
    }

    private BookmarkExampleCounts counts() {
        return service.countExamples(List.of(BOOKMARK_ID)).getOrDefault(BOOKMARK_ID, BookmarkExampleCounts.NONE);
    }

    private int status(Runnable call) {
        return assertThrows(ResponseStatusException.class, call::run).getStatusCode().value();
    }

    private void memberWith(PermissionKey... permissions) {
        OrganizationMembership membership = new OrganizationMembership();
        membership.setOrganization(organization);
        membership.setRoleDefinition(TestFixtures.role(organization, null, permissions));
        when(access.requireMembership(USER_ID, ORG_ID)).thenReturn(membership);
    }
}
