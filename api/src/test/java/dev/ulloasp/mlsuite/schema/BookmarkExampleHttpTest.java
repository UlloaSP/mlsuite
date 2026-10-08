package dev.ulloasp.mlsuite.schema;

import static dev.ulloasp.mlsuite.schema.BookmarkExampleFixtures.formRunInputs;
import static dev.ulloasp.mlsuite.schema.BookmarkExampleFixtures.nextVersion;
import static dev.ulloasp.mlsuite.schema.BookmarkExampleFixtures.run;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.EnumSet;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextImpl;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.web.client.RestTemplate;

import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationMembership;
import dev.ulloasp.mlsuite.role.adapter.out.persistence.repository.RoleDefinitionRepository;
import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.schema.adapter.in.web.PublicBookmarkController;
import dev.ulloasp.mlsuite.schema.adapter.in.web.SchemaBookmarkController;
import dev.ulloasp.mlsuite.schema.adapter.in.web.SchemaBookmarkExampleController;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionRunRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaBookmarkExampleRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaBookmarkRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaModelBindingRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaVersionRepository;
import dev.ulloasp.mlsuite.schema.application.port.in.PredictBookmarkCatalogUseCase;
import dev.ulloasp.mlsuite.schema.application.port.in.PublicPredictionUseCase;
import dev.ulloasp.mlsuite.schema.application.port.in.PublicRunUseCase;
import dev.ulloasp.mlsuite.schema.application.service.BookmarkPublishability;
import dev.ulloasp.mlsuite.schema.application.service.PublicBookmarkService;
import dev.ulloasp.mlsuite.schema.application.service.SchemaBookmarkExampleService;
import dev.ulloasp.mlsuite.schema.application.service.SchemaBookmarkServiceImpl;
import dev.ulloasp.mlsuite.schema.domain.model.BookmarkVisibility;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmarkExample;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaVersion;
import dev.ulloasp.mlsuite.security.SecurityConfig;
import dev.ulloasp.mlsuite.security.auth.AuthenticatedUserPrincipal;
import dev.ulloasp.mlsuite.support.TestFixtures;
import dev.ulloasp.mlsuite.user.domain.model.SystemRole;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;

/**
 * The example endpoints behind the real security filter chain and the real services, over
 * in-memory persistence, so a request exercises the same rules a deployed API applies.
 */
@WebMvcTest(controllers = { SchemaBookmarkController.class, SchemaBookmarkExampleController.class,
        PublicBookmarkController.class }, properties = {
                "spring.profiles.active=test",
                "logging.file.name=target/bookmark-example-http-test.log",
                "server.port=0",
                "cors.allow-origins=http://localhost:5173" })
@Import({ SecurityConfig.class, SchemaBookmarkServiceImpl.class, SchemaBookmarkExampleService.class,
        PublicBookmarkService.class, BookmarkPublishability.class, WorkspaceAuthorizationService.class })
@MockitoBean(types = { PredictBookmarkCatalogUseCase.class, PublicPredictionUseCase.class, PublicRunUseCase.class, RestTemplate.class,
        UserDetailsService.class, SchemaRepository.class, SchemaModelBindingRepository.class,
        RoleDefinitionRepository.class })
class BookmarkExampleHttpTest {

    private static final long USER_ID = 7L;
    private static final long ORG_ID = 41L;
    private static final long BOOKMARK_ID = 70L;
    private static final long RUN_ID = 500L;
    private static final String PUBLIC_ID = "8f6f3c0e-58a2-4c0b-9d0c-0d5c1f6e2a11";
    private static final String EXAMPLES = "/api/schema-bookmarks/{bookmarkId}/examples";
    private static final String EXAMPLE = EXAMPLES + "/{runId}";
    private static final String PUBLIC_EXAMPLES = "/api/public/bookmarks/{publicId}/examples";

    @Autowired
    private MockMvc mockMvc;
    @MockitoBean
    private WorkspaceAccessService access;
    @MockitoBean
    private SchemaBookmarkRepository bookmarks;
    @MockitoBean
    private SchemaVersionRepository versions;
    @MockitoBean
    private PredictionRunRepository runs;
    @MockitoBean
    private SchemaBookmarkExampleRepository examples;

    private final Organization organization = TestFixtures.organization(ORG_ID);
    private SchemaBookmark bookmark;
    private List<SchemaBookmarkExample> stored;

    @BeforeEach
    void setUp() {
        bookmark = BookmarkExampleFixtures.bookmark();
        bookmark.setPublicId(PUBLIC_ID);
        bookmark.setVisibility(BookmarkVisibility.PUBLIC);
        stored = BookmarkExampleFixtures.stored(examples);
        when(access.requireCurrentOrganization(USER_ID)).thenReturn(organization);
        when(bookmarks.findByIdAndOrganizationId(BOOKMARK_ID, ORG_ID)).thenReturn(Optional.of(bookmark));
        when(bookmarks.findPublishedByPublicId(PUBLIC_ID)).thenAnswer(call ->
                bookmark.getVisibility() == BookmarkVisibility.PUBLIC ? Optional.of(bookmark) : Optional.empty());
        when(runs.findByIdAndOrganizationId(RUN_ID, ORG_ID)).thenReturn(Optional.of(
                run(RUN_ID, bookmark, bookmark.getVersion(), "Typical case", formRunInputs())));
        memberWith(PermissionKey.VIEW_MODELS, PermissionKey.CREATE_MODELS, PermissionKey.PUBLISH_BOOKMARKS);
    }

    @Test
    void theWorkspaceExampleEndpointsRequireASession() throws Exception {
        mockMvc.perform(get(EXAMPLES, BOOKMARK_ID)).andExpect(status().isUnauthorized());
        mockMvc.perform(put(EXAMPLE, BOOKMARK_ID, RUN_ID)).andExpect(status().isUnauthorized());
        mockMvc.perform(delete(EXAMPLE, BOOKMARK_ID, RUN_ID)).andExpect(status().isUnauthorized());

        assertTrue(stored.isEmpty());
    }

    @Test
    void markingAndUnmarkingWithoutThePermissionAreForbiddenButTheListIsReadable() throws Exception {
        mockMvc.perform(signedIn(put(EXAMPLE, BOOKMARK_ID, RUN_ID))).andExpect(status().isOk());
        memberWith(EnumSet.complementOf(EnumSet.of(PermissionKey.PUBLISH_BOOKMARKS)).toArray(PermissionKey[]::new));

        mockMvc.perform(signedIn(put(EXAMPLE, BOOKMARK_ID, RUN_ID))).andExpect(status().isForbidden());
        mockMvc.perform(signedIn(delete(EXAMPLE, BOOKMARK_ID, RUN_ID))).andExpect(status().isForbidden());
        mockMvc.perform(signedIn(get(EXAMPLES, BOOKMARK_ID)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    void aMemberWhoMayPublishMarksListsAndUnmarksAnExample() throws Exception {
        mockMvc.perform(signedIn(put(EXAMPLE, BOOKMARK_ID, RUN_ID)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(5))
                .andExpect(jsonPath("$.runId").value(RUN_ID))
                .andExpect(jsonPath("$.runName").value("Typical case"))
                .andExpect(jsonPath("$.runVersion").value(1))
                .andExpect(jsonPath("$.runVersionName").value("v1"))
                .andExpect(jsonPath("$.status").value("SERVED"));
        mockMvc.perform(signedIn(get(EXAMPLES, BOOKMARK_ID)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].runId").value(RUN_ID));
        mockMvc.perform(signedIn(get("/api/schema-bookmarks/{id}", BOOKMARK_ID)))
                .andExpect(jsonPath("$.exampleCount").value(1))
                .andExpect(jsonPath("$.staleExampleCount").value(0));

        mockMvc.perform(signedIn(delete(EXAMPLE, BOOKMARK_ID, RUN_ID))).andExpect(status().isNoContent());
        mockMvc.perform(signedIn(get(EXAMPLES, BOOKMARK_ID))).andExpect(jsonPath("$.length()").value(0));
        mockMvc.perform(signedIn(get("/api/schema-bookmarks/{id}", BOOKMARK_ID)))
                .andExpect(jsonPath("$.exampleCount").value(0));
    }

    @Test
    void aRunThatCannotBeAnExampleIsRefused() throws Exception {
        when(runs.findByIdAndOrganizationId(RUN_ID + 1, ORG_ID)).thenReturn(Optional.of(
                run(RUN_ID + 1, bookmark, nextVersion(bookmark), "Other snapshot", formRunInputs())));

        mockMvc.perform(signedIn(put(EXAMPLE, BOOKMARK_ID, RUN_ID + 1)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message")
                        .value("Only runs of the snapshot the bookmark points to can be its examples"));
        mockMvc.perform(signedIn(put(EXAMPLE, BOOKMARK_ID, 999L))).andExpect(status().isNotFound());
        mockMvc.perform(signedIn(put(EXAMPLE, 71L, RUN_ID))).andExpect(status().isNotFound());
    }

    @Test
    void anonymousVisitorsReadServedExamplesWithoutInternalFields() throws Exception {
        mockMvc.perform(signedIn(put(EXAMPLE, BOOKMARK_ID, RUN_ID))).andExpect(status().isOk());

        mockMvc.perform(get(PUBLIC_EXAMPLES, PUBLIC_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].length()").value(3))
                .andExpect(jsonPath("$[0].id").value(stored.get(0).getPublicId()))
                .andExpect(jsonPath("$[0].name").value("Typical case"))
                .andExpect(jsonPath("$[0].inputs.length()").value(3))
                .andExpect(jsonPath("$[0].inputs.Age").value(52))
                .andExpect(jsonPath("$[0].inputs.smoker").value("yes"))
                .andExpect(jsonPath("$[0].inputs.Sex").value("F"))
                .andExpect(content().string(not(containsString("alice.owner@example.test"))))
                .andExpect(content().string(not(containsString("Alice Owner"))))
                .andExpect(content().string(not(containsString("createdAt"))))
                .andExpect(content().string(not(containsString(BookmarkExampleFixtures.MODEL_FEATURE))));
    }

    @Test
    void aPrivateOrUnknownBookmarkHasNoPublicExamples() throws Exception {
        mockMvc.perform(signedIn(put(EXAMPLE, BOOKMARK_ID, RUN_ID))).andExpect(status().isOk());
        mockMvc.perform(signedIn(post("/api/schema-bookmarks/{id}/unpublish", BOOKMARK_ID)))
                .andExpect(status().isOk())
                // The example stays marked while the bookmark is private; it is just not served.
                .andExpect(jsonPath("$.exampleCount").value(1));

        for (String publicId : List.of(PUBLIC_ID, "unknown-bookmark")) {
            mockMvc.perform(get(PUBLIC_EXAMPLES, publicId))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.message").value("Public bookmark not found"));
        }
        mockMvc.perform(signedIn(get(EXAMPLES, BOOKMARK_ID)))
                .andExpect(jsonPath("$[0].status").value("BOOKMARK_PRIVATE"));
    }

    @Test
    void movingTheBookmarkStopsServingItsOldExamples() throws Exception {
        SchemaVersion second = nextVersion(bookmark);
        when(versions.findByIdAndOrganizationId(second.getId(), ORG_ID)).thenReturn(Optional.of(second));
        mockMvc.perform(signedIn(put(EXAMPLE, BOOKMARK_ID, RUN_ID))).andExpect(status().isOk());
        mockMvc.perform(get(PUBLIC_EXAMPLES, PUBLIC_ID)).andExpect(jsonPath("$.length()").value(1));

        mockMvc.perform(signedIn(put("/api/schema-bookmarks/{id}", BOOKMARK_ID))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"versionId\":" + second.getId() + "}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.version").value(2))
                .andExpect(jsonPath("$.exampleCount").value(0))
                .andExpect(jsonPath("$.staleExampleCount").value(1));

        mockMvc.perform(get(PUBLIC_EXAMPLES, PUBLIC_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
        mockMvc.perform(signedIn(get(EXAMPLES, BOOKMARK_ID)))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].status").value("BOOKMARK_MOVED"));
    }

    private void memberWith(PermissionKey... permissions) {
        OrganizationMembership membership = new OrganizationMembership();
        membership.setOrganization(organization);
        membership.setRoleDefinition(TestFixtures.role(organization, null, permissions));
        when(access.requireMembership(USER_ID, ORG_ID)).thenReturn(membership);
    }

    /** A logged-in session, as the login endpoint leaves it for the filter chain to read. */
    private static MockHttpServletRequestBuilder signedIn(MockHttpServletRequestBuilder request) {
        var principal = new AuthenticatedUserPrincipal(USER_ID, "alice@example.com", "hash", SystemRole.USER, true);
        var authentication = UsernamePasswordAuthenticationToken.authenticated(
                principal, null, principal.getAuthorities());
        return request.sessionAttr(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY,
                new SecurityContextImpl(authentication));
    }
}
