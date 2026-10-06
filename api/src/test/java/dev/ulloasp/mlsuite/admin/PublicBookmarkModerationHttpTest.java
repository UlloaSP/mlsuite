package dev.ulloasp.mlsuite.admin;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextImpl;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.admin.moderation.ModeratedBookmarkDto;
import dev.ulloasp.mlsuite.admin.moderation.PublicBookmarkModerationController;
import dev.ulloasp.mlsuite.admin.moderation.PublicBookmarkModerationService;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.schema.adapter.in.web.SchemaBookmarkController;
import dev.ulloasp.mlsuite.schema.application.port.in.PredictBookmarkCatalogUseCase;
import dev.ulloasp.mlsuite.schema.application.port.in.SchemaBookmarkUseCase;
import dev.ulloasp.mlsuite.schema.domain.model.BookmarkVisibility;
import dev.ulloasp.mlsuite.schema.domain.model.Schema;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaVersion;
import dev.ulloasp.mlsuite.security.SecurityConfig;
import dev.ulloasp.mlsuite.security.auth.AuthenticatedUserPrincipal;
import dev.ulloasp.mlsuite.support.TestFixtures;
import dev.ulloasp.mlsuite.user.domain.model.SystemRole;
import dev.ulloasp.mlsuite.util.PageDto;

/** The moderation endpoints behind the real security filter chain and method security. */
@WebMvcTest(controllers = { PublicBookmarkModerationController.class, SchemaBookmarkController.class }, properties = {
        "spring.profiles.active=test",
        "logging.file.name=target/bookmark-moderation-http-test.log",
        "server.port=0",
        "cors.allow-origins=http://localhost:5173" })
@Import(SecurityConfig.class)
@MockitoBean(types = { PredictBookmarkCatalogUseCase.class, RestTemplate.class, UserDetailsService.class })
class PublicBookmarkModerationHttpTest {

    private static final long SUPERADMIN_ID = 1L;
    private static final long MEMBER_ID = 7L;
    private static final long BOOKMARK_ID = 70L;
    private static final String PUBLIC_ID = "8f6f3c0e-58a2-4c0b-9d0c-0d5c1f6e2a11";
    private static final String LIST = "/api/admin/public-bookmarks";
    private static final String UNPUBLISH = "/api/admin/public-bookmarks/{id}/unpublish";

    @Autowired
    private MockMvc mockMvc;
    @MockitoBean
    private PublicBookmarkModerationService moderation;
    @MockitoBean
    private SchemaBookmarkUseCase memberBookmarks;

    @Test
    void anonymousVisitorsAreUnauthorized() throws Exception {
        mockMvc.perform(get(LIST)).andExpect(status().isUnauthorized());
        mockMvc.perform(post(UNPUBLISH, BOOKMARK_ID)).andExpect(status().isUnauthorized());

        verifyNoInteractions(moderation);
    }

    @Test
    void membersWithoutTheSuperadminRoleAreForbidden() throws Exception {
        mockMvc.perform(signedIn(get(LIST), MEMBER_ID, SystemRole.USER)).andExpect(status().isForbidden());
        mockMvc.perform(signedIn(post(UNPUBLISH, BOOKMARK_ID), MEMBER_ID, SystemRole.USER))
                .andExpect(status().isForbidden());

        verifyNoInteractions(moderation);
    }

    @Test
    void anOwnerWithoutTheSuperadminRoleUnpublishesOnlyThroughTheWorkspaceEndpoint() throws Exception {
        when(memberBookmarks.unpublishBookmark(MEMBER_ID, BOOKMARK_ID)).thenReturn(stored(BookmarkVisibility.PRIVATE));

        mockMvc.perform(signedIn(post("/api/schema-bookmarks/{id}/unpublish", BOOKMARK_ID), MEMBER_ID, SystemRole.USER))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.visibility").value("PRIVATE"));
        mockMvc.perform(signedIn(post(UNPUBLISH, BOOKMARK_ID), MEMBER_ID, SystemRole.USER))
                .andExpect(status().isForbidden());

        verifyNoInteractions(moderation);
    }

    @Test
    void aSuperadminListsPublicBookmarksWithWhatAModeratorNeeds() throws Exception {
        when(moderation.list(1, 2, "acme", "organization")).thenReturn(new PageDto<>(
                List.of(new ModeratedBookmarkDto(BOOKMARK_ID, "production", "Risk", true, "Acme Health", 3, "Baseline",
                        PUBLIC_ID, OffsetDateTime.parse("2026-10-01T10:00:00Z"))),
                1, 2, 3, false));

        mockMvc.perform(signedIn(get(LIST), SUPERADMIN_ID, SystemRole.SUPERADMIN)
                .param("page", "1").param("size", "2").param("search", "acme").param("sort", "organization"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(3))
                .andExpect(jsonPath("$.hasNext").value(false))
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.items[0].length()").value(9))
                .andExpect(jsonPath("$.items[0].id").value(BOOKMARK_ID))
                .andExpect(jsonPath("$.items[0].name").value("production"))
                .andExpect(jsonPath("$.items[0].schemaName").value("Risk"))
                .andExpect(jsonPath("$.items[0].schemaArchived").value(true))
                .andExpect(jsonPath("$.items[0].organizationName").value("Acme Health"))
                .andExpect(jsonPath("$.items[0].version").value(3))
                .andExpect(jsonPath("$.items[0].versionName").value("Baseline"))
                .andExpect(jsonPath("$.items[0].publicId").value(PUBLIC_ID))
                .andExpect(jsonPath("$.items[0].updatedAt").exists());
    }

    @Test
    void theListDefaultsToTheFirstPageOfTheLatestUpdates() throws Exception {
        when(moderation.list(0, 8, "", "updated")).thenReturn(new PageDto<>(List.of(), 0, 8, 0, false));

        mockMvc.perform(signedIn(get(LIST), SUPERADMIN_ID, SystemRole.SUPERADMIN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(0));
    }

    @Test
    void aSuperadminUnpublishesABookmarkOfAnyOrganization() throws Exception {
        when(moderation.unpublish(SUPERADMIN_ID, BOOKMARK_ID)).thenReturn(stored(BookmarkVisibility.PRIVATE));

        mockMvc.perform(signedIn(post(UNPUBLISH, BOOKMARK_ID), SUPERADMIN_ID, SystemRole.SUPERADMIN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(BOOKMARK_ID))
                .andExpect(jsonPath("$.visibility").value("PRIVATE"))
                .andExpect(jsonPath("$.publicId").value(PUBLIC_ID));

        verify(moderation).unpublish(SUPERADMIN_ID, BOOKMARK_ID);
        verifyNoInteractions(memberBookmarks);
    }

    @Test
    void anUnknownBookmarkIsNotFound() throws Exception {
        when(moderation.unpublish(SUPERADMIN_ID, BOOKMARK_ID))
                .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND, "Schema bookmark not found"));

        mockMvc.perform(signedIn(post(UNPUBLISH, BOOKMARK_ID), SUPERADMIN_ID, SystemRole.SUPERADMIN))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Schema bookmark not found"));
    }

    private static SchemaBookmark stored(BookmarkVisibility visibility) {
        Organization organization = TestFixtures.organization();
        Schema schema = new Schema(organization, "Risk", null);
        schema.setId(5L);
        SchemaVersion version = new SchemaVersion(schema, 1, "v1", Map.of());
        version.setId(9L);
        SchemaBookmark bookmark = new SchemaBookmark(schema, version, "production");
        bookmark.setId(BOOKMARK_ID);
        bookmark.setVisibility(visibility);
        bookmark.setPublicId(PUBLIC_ID);
        return bookmark;
    }

    /** A logged-in session, as the login endpoint leaves it for the filter chain to read. */
    private static MockHttpServletRequestBuilder signedIn(MockHttpServletRequestBuilder request, long userId,
            SystemRole role) {
        var principal = new AuthenticatedUserPrincipal(userId, "user" + userId + "@example.com", "hash", role, true);
        var authentication = UsernamePasswordAuthenticationToken.authenticated(
                principal, null, principal.getAuthorities());
        return request.sessionAttr(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY,
                new SecurityContextImpl(authentication));
    }
}
