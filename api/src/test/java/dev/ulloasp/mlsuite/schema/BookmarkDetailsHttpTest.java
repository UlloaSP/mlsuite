package dev.ulloasp.mlsuite.schema;

import static dev.ulloasp.mlsuite.schema.SchemaFlowFixtures.bookmark;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.OffsetDateTime;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextImpl;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.databind.ObjectMapper;

import dev.ulloasp.mlsuite.organization.domain.exception.OrganizationAccessDeniedException;
import dev.ulloasp.mlsuite.schema.adapter.in.web.SchemaBookmarkController;
import dev.ulloasp.mlsuite.schema.application.dto.CreateSchemaBookmarkRequest;
import dev.ulloasp.mlsuite.schema.application.dto.UpdateSchemaBookmarkRequest;
import dev.ulloasp.mlsuite.schema.application.port.in.PredictBookmarkCatalogUseCase;
import dev.ulloasp.mlsuite.schema.application.port.in.SchemaBookmarkExampleUseCase;
import dev.ulloasp.mlsuite.schema.application.port.in.SchemaBookmarkUseCase;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;
import dev.ulloasp.mlsuite.security.SecurityConfig;
import dev.ulloasp.mlsuite.security.auth.AuthenticatedUserPrincipal;
import dev.ulloasp.mlsuite.user.domain.model.SystemRole;

/** Saving a bookmark with a description and editing its name and description, over HTTP. */
@WebMvcTest(controllers = SchemaBookmarkController.class, properties = {
        "spring.profiles.active=test",
        "logging.file.name=target/bookmark-details-http-test.log",
        "server.port=0",
        "cors.allow-origins=http://localhost:5173" })
@Import(SecurityConfig.class)
@MockitoBean(types = { PredictBookmarkCatalogUseCase.class, RestTemplate.class, SchemaBookmarkExampleUseCase.class,
        UserDetailsService.class })
class BookmarkDetailsHttpTest {

    private static final long USER_ID = 7L;
    private static final long SCHEMA_ID = 5L;
    private static final long BOOKMARK_ID = 70L;

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private SchemaBookmarkUseCase bookmarks;

    @Test
    void aBookmarkIsSavedWithItsDescription() throws Exception {
        var request = new CreateSchemaBookmarkRequest("production", 9L, "Estimates risk.");
        when(bookmarks.createBookmark(USER_ID, SCHEMA_ID, request)).thenReturn(stored("production", "Estimates risk."));

        mockMvc.perform(signedIn(json(post("/api/schemas/{id}/bookmarks", SCHEMA_ID), request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("production"))
                .andExpect(jsonPath("$.description").value("Estimates risk."));
    }

    @Test
    void theDescriptionIsOptionalWhenSaving() throws Exception {
        when(bookmarks.createBookmark(USER_ID, SCHEMA_ID, new CreateSchemaBookmarkRequest("production", 9L, null)))
                .thenReturn(stored("production", null));

        mockMvc.perform(signedIn(post("/api/schemas/{id}/bookmarks", SCHEMA_ID)
                .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"production\",\"versionId\":9}")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.description").isEmpty());
    }

    @Test
    void anUpdateReturnsTheBookmarkWithItsNewNameAndDescription() throws Exception {
        var request = new UpdateSchemaBookmarkRequest("cardio-screening", "Screens for cardiovascular risk.");
        when(bookmarks.updateBookmark(USER_ID, BOOKMARK_ID, request))
                .thenReturn(stored("cardio-screening", "Screens for cardiovascular risk."));

        mockMvc.perform(signedIn(json(patch("/api/schema-bookmarks/{id}", BOOKMARK_ID), request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(BOOKMARK_ID))
                .andExpect(jsonPath("$.name").value("cardio-screening"))
                .andExpect(jsonPath("$.description").value("Screens for cardiovascular risk."));
    }

    @Test
    void updatingRequiresASession() throws Exception {
        mockMvc.perform(json(patch("/api/schema-bookmarks/{id}", BOOKMARK_ID),
                new UpdateSchemaBookmarkRequest("renamed", null)))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(bookmarks);
    }

    @Test
    void updatingWithoutThePermissionIsForbidden() throws Exception {
        when(bookmarks.updateBookmark(eq(USER_ID), eq(BOOKMARK_ID), any()))
                .thenThrow(new OrganizationAccessDeniedException(41L));

        mockMvc.perform(signedIn(json(patch("/api/schema-bookmarks/{id}", BOOKMARK_ID),
                new UpdateSchemaBookmarkRequest("renamed", null))))
                .andExpect(status().isForbidden());
    }

    @Test
    void aNameTheSchemaAlreadyHasIsAConflictThatSaysSo() throws Exception {
        String reason = "This schema already has a bookmark named \"staging\".";
        when(bookmarks.updateBookmark(eq(USER_ID), eq(BOOKMARK_ID), any()))
                .thenThrow(new ResponseStatusException(HttpStatus.CONFLICT, reason));

        mockMvc.perform(signedIn(json(patch("/api/schema-bookmarks/{id}", BOOKMARK_ID),
                new UpdateSchemaBookmarkRequest("staging", null))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value(reason));
    }

    @Test
    void namesAndDescriptionsOverTheirLengthAreRefusedBeforeTheService() throws Exception {
        String longName = "n".repeat(SchemaBookmark.NAME_MAX_LENGTH + 1);
        String longDescription = "d".repeat(SchemaBookmark.DESCRIPTION_MAX_LENGTH + 1);

        mockMvc.perform(signedIn(json(patch("/api/schema-bookmarks/{id}", BOOKMARK_ID),
                new UpdateSchemaBookmarkRequest(longName, "fine"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("name: must be at most 180 characters"));
        mockMvc.perform(signedIn(json(patch("/api/schema-bookmarks/{id}", BOOKMARK_ID),
                new UpdateSchemaBookmarkRequest("fine", longDescription))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("description: must be at most 800 characters"));
        mockMvc.perform(signedIn(json(patch("/api/schema-bookmarks/{id}", BOOKMARK_ID), Map.of("description", "x"))))
                .andExpect(status().isBadRequest());
        mockMvc.perform(signedIn(json(post("/api/schemas/{id}/bookmarks", SCHEMA_ID),
                new CreateSchemaBookmarkRequest(longName, 9L, null))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("name: must be at most 180 characters"));
        mockMvc.perform(signedIn(json(post("/api/schemas/{id}/bookmarks", SCHEMA_ID),
                new CreateSchemaBookmarkRequest("fine", 9L, longDescription))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("description: must be at most 800 characters"));

        verifyNoInteractions(bookmarks);
    }

    private static SchemaBookmark stored(String name, String description) {
        SchemaBookmark bookmark = bookmark();
        bookmark.setName(name);
        bookmark.setDescription(description);
        bookmark.setCreatedAt(OffsetDateTime.parse("2026-10-01T10:00:00Z"));
        bookmark.setUpdatedAt(OffsetDateTime.parse("2026-10-01T10:00:00Z"));
        return bookmark;
    }

    private MockHttpServletRequestBuilder json(MockHttpServletRequestBuilder request, Object body) throws Exception {
        return request.contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(body));
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
