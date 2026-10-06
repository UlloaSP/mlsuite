package dev.ulloasp.mlsuite.schema;

import static dev.ulloasp.mlsuite.schema.SchemaFlowFixtures.bookmark;
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
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
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

import dev.ulloasp.mlsuite.organization.domain.exception.OrganizationAccessDeniedException;
import dev.ulloasp.mlsuite.schema.adapter.in.web.PublicBookmarkController;
import dev.ulloasp.mlsuite.schema.adapter.in.web.SchemaBookmarkController;
import dev.ulloasp.mlsuite.schema.application.dto.PublicBookmarkDto;
import dev.ulloasp.mlsuite.schema.application.port.in.PredictBookmarkCatalogUseCase;
import dev.ulloasp.mlsuite.schema.application.port.in.PublicBookmarkUseCase;
import dev.ulloasp.mlsuite.schema.application.port.in.SchemaBookmarkUseCase;
import dev.ulloasp.mlsuite.schema.domain.model.BookmarkVisibility;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;
import dev.ulloasp.mlsuite.security.SecurityConfig;
import dev.ulloasp.mlsuite.security.auth.AuthenticatedUserPrincipal;
import dev.ulloasp.mlsuite.user.domain.model.SystemRole;

/** The bookmark publishing endpoints behind the real security filter chain. */
@WebMvcTest(controllers = { SchemaBookmarkController.class, PublicBookmarkController.class }, properties = {
        "spring.profiles.active=test",
        "logging.file.name=target/bookmark-publishing-http-test.log",
        "server.port=0",
        "cors.allow-origins=http://localhost:5173" })
@Import(SecurityConfig.class)
@MockitoBean(types = { PredictBookmarkCatalogUseCase.class, RestTemplate.class, UserDetailsService.class })
class BookmarkPublishingHttpTest {

    private static final long USER_ID = 7L;
    private static final long BOOKMARK_ID = 70L;
    private static final String PUBLIC_ID = "8f6f3c0e-58a2-4c0b-9d0c-0d5c1f6e2a11";

    @Autowired
    private MockMvc mockMvc;
    @MockitoBean
    private SchemaBookmarkUseCase bookmarks;
    @MockitoBean
    private PublicBookmarkUseCase publicBookmarks;

    @ParameterizedTest
    @ValueSource(strings = { "publish", "unpublish" })
    void changingVisibilityRequiresASession(String action) throws Exception {
        mockMvc.perform(post("/api/schema-bookmarks/{id}/{action}", BOOKMARK_ID, action))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(bookmarks);
    }

    @ParameterizedTest
    @ValueSource(strings = { "publish", "unpublish" })
    void changingVisibilityWithoutThePermissionIsForbidden(String action) throws Exception {
        when(bookmarks.publishBookmark(USER_ID, BOOKMARK_ID)).thenThrow(new OrganizationAccessDeniedException(41L));
        when(bookmarks.unpublishBookmark(USER_ID, BOOKMARK_ID)).thenThrow(new OrganizationAccessDeniedException(41L));

        mockMvc.perform(signedIn(post("/api/schema-bookmarks/{id}/{action}", BOOKMARK_ID, action)))
                .andExpect(status().isForbidden());
    }

    @Test
    void publishingReturnsThePublicState() throws Exception {
        when(bookmarks.publishBookmark(USER_ID, BOOKMARK_ID)).thenReturn(stored(BookmarkVisibility.PUBLIC));

        mockMvc.perform(signedIn(post("/api/schema-bookmarks/{id}/publish", BOOKMARK_ID)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(BOOKMARK_ID))
                .andExpect(jsonPath("$.visibility").value("PUBLIC"))
                .andExpect(jsonPath("$.publicId").value(PUBLIC_ID));
    }

    @Test
    void unpublishingReturnsThePrivateStateAndKeepsThePublicId() throws Exception {
        when(bookmarks.unpublishBookmark(USER_ID, BOOKMARK_ID)).thenReturn(stored(BookmarkVisibility.PRIVATE));

        mockMvc.perform(signedIn(post("/api/schema-bookmarks/{id}/unpublish", BOOKMARK_ID)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.visibility").value("PRIVATE"))
                .andExpect(jsonPath("$.publicId").value(PUBLIC_ID));
    }

    @Test
    void anonymousVisitorsReadAPublishedBookmarkWithoutInternalFields() throws Exception {
        when(publicBookmarks.getPublishedBookmark(PUBLIC_ID)).thenReturn(new PublicBookmarkDto(
                PUBLIC_ID, "production", "Risk", null, 1, "v1", "Org",
                Map.of("fields", List.of(Map.of("kind", "number", "label", "Age"))),
                OffsetDateTime.parse("2026-10-01T10:00:00Z")));

        mockMvc.perform(get("/api/public/bookmarks/{publicId}", PUBLIC_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(9))
                .andExpect(jsonPath("$.publicId").value(PUBLIC_ID))
                .andExpect(jsonPath("$.name").value("production"))
                .andExpect(jsonPath("$.schemaName").value("Risk"))
                .andExpect(jsonPath("$.schemaDescription").isEmpty())
                .andExpect(jsonPath("$.version").value(1))
                .andExpect(jsonPath("$.versionName").value("v1"))
                .andExpect(jsonPath("$.organizationName").value("Org"))
                .andExpect(jsonPath("$.formSchema.fields[0].label").value("Age"))
                .andExpect(jsonPath("$.updatedAt").exists())
                .andExpect(jsonPath("$.id").doesNotExist())
                .andExpect(jsonPath("$.schemaId").doesNotExist())
                .andExpect(jsonPath("$.versionId").doesNotExist());
    }

    @ParameterizedTest
    @ValueSource(strings = { "private-bookmark", "unknown-bookmark" })
    void aPrivateOrUnknownPublicIdIsNotFound(String publicId) throws Exception {
        when(publicBookmarks.getPublishedBookmark(publicId))
                .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND, "Public bookmark not found"));

        mockMvc.perform(get("/api/public/bookmarks/{publicId}", publicId))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Public bookmark not found"));
    }

    @Test
    void theWorkspaceBookmarkEndpointsStayBehindLogin() throws Exception {
        mockMvc.perform(get("/api/schema-bookmarks/{id}", BOOKMARK_ID)).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/schema-bookmarks")).andExpect(status().isUnauthorized());
    }

    private static SchemaBookmark stored(BookmarkVisibility visibility) {
        SchemaBookmark bookmark = bookmark();
        bookmark.setVisibility(visibility);
        bookmark.setPublicId(PUBLIC_ID);
        return bookmark;
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
