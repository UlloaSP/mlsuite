package dev.ulloasp.mlsuite.schema;

import static dev.ulloasp.mlsuite.schema.SchemaFlowFixtures.bookmark;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
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
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
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

import dev.ulloasp.mlsuite.organization.domain.exception.OrganizationAccessDeniedException;
import dev.ulloasp.mlsuite.schema.adapter.in.web.PublicBookmarkController;
import dev.ulloasp.mlsuite.schema.adapter.in.web.SchemaBookmarkController;
import dev.ulloasp.mlsuite.schema.application.dto.PublicBookmarkDto;
import dev.ulloasp.mlsuite.schema.application.dto.PublicPredictionDto;
import dev.ulloasp.mlsuite.schema.application.dto.PublicRunDto;
import dev.ulloasp.mlsuite.schema.application.dto.PublicRunOutcome;
import dev.ulloasp.mlsuite.schema.application.dto.PublicPredictionReportDto;
import dev.ulloasp.mlsuite.schema.application.dto.PublicPredictionRequest;
import dev.ulloasp.mlsuite.schema.application.dto.PublicRunQuotaDto;
import dev.ulloasp.mlsuite.schema.application.port.in.PredictBookmarkCatalogUseCase;
import dev.ulloasp.mlsuite.schema.application.port.in.PublicBookmarkUseCase;
import dev.ulloasp.mlsuite.schema.application.port.in.PublicPredictionUseCase;
import dev.ulloasp.mlsuite.schema.application.port.in.PublicRunUseCase;
import dev.ulloasp.mlsuite.schema.application.port.in.SchemaBookmarkExampleUseCase;
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
@MockitoBean(types = { PredictBookmarkCatalogUseCase.class, PublicRunUseCase.class, RestTemplate.class,
        SchemaBookmarkExampleUseCase.class, UserDetailsService.class })
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
    @MockitoBean
    private PublicPredictionUseCase publicPredictions;

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
                PUBLIC_ID, "production", "Estimates risk.", "Published in Lancet 2026, doi:10.1000/xyz.", 1, 1, 0,
                "Org", "/api/public/organizations/3/logo?v=1",
                Map.of("fields", List.of(Map.of("kind", "number", "label", "Age"))),
                OffsetDateTime.parse("2026-10-01T10:00:00Z")));

        mockMvc.perform(get("/api/public/bookmarks/{publicId}", PUBLIC_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(11))
                .andExpect(jsonPath("$.publicId").value(PUBLIC_ID))
                .andExpect(jsonPath("$.name").value("production"))
                .andExpect(jsonPath("$.description").value("Estimates risk."))
                .andExpect(jsonPath("$.version").value(1))
                .andExpect(jsonPath("$.inputCount").value(1))
                .andExpect(jsonPath("$.reportCount").value(0))
                .andExpect(jsonPath("$.organizationName").value("Org"))
                .andExpect(jsonPath("$.organizationLogoUrl").value("/api/public/organizations/3/logo?v=1"))
                .andExpect(jsonPath("$.publicationNote").value("Published in Lancet 2026, doi:10.1000/xyz."))
                .andExpect(jsonPath("$.formSchema.fields[0].label").value("Age"))
                .andExpect(jsonPath("$.updatedAt").exists())
                .andExpect(jsonPath("$.id").doesNotExist())
                .andExpect(jsonPath("$.schemaId").doesNotExist())
                .andExpect(jsonPath("$.schemaName").doesNotExist())
                .andExpect(jsonPath("$.versionName").doesNotExist())
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
        mockMvc.perform(get("/api/schema-bookmarks/public/{publicId}", PUBLIC_ID)).andExpect(status().isUnauthorized());
    }

    @Test
    void aRefusedPublicationTellsTheMemberWhy() throws Exception {
        String reason = "This bookmark cannot be published. Model \"huge\" is 62.0 MB; public bookmarks can only "
                + "run models up to 50 MB.";
        when(bookmarks.publishBookmark(USER_ID, BOOKMARK_ID))
                .thenThrow(new ResponseStatusException(HttpStatus.CONFLICT, reason));

        mockMvc.perform(signedIn(post("/api/schema-bookmarks/{id}/publish", BOOKMARK_ID)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value(reason));
    }

    @Test
    void membersResolveTheirBookmarkFromItsPublicId() throws Exception {
        when(bookmarks.getBookmarkByPublicId(USER_ID, PUBLIC_ID)).thenReturn(stored(BookmarkVisibility.PUBLIC));
        when(bookmarks.getBookmarkByPublicId(USER_ID, "of-another-organization"))
                .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND, "Schema bookmark not found"));

        mockMvc.perform(signedIn(get("/api/schema-bookmarks/public/{publicId}", PUBLIC_ID)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(BOOKMARK_ID));
        mockMvc.perform(signedIn(get("/api/schema-bookmarks/public/{publicId}", "of-another-organization")))
                .andExpect(status().isNotFound());
    }

    @Test
    void anonymousVisitorsRunAPublishedBookmarkAndGetOnlyItsReports() throws Exception {
        when(publicPredictions.run(eq(PUBLIC_ID), eq(new PublicPredictionRequest(3, Map.of("in0", 52))), any()))
                .thenReturn(new PublicRunOutcome(new PublicPredictionDto(
                        new PublicRunDto(81L, 3, OffsetDateTime.parse("2026-10-02T09:00:00Z"), Map.of("Age", 52),
                                List.of(new PublicPredictionReportDto("out0",
                                        Map.of("kind", "regressor", "values", List.of(41.5)))),
                                List.of()),
                        new PublicRunQuotaDto(5, 4, OffsetDateTime.parse("2026-10-02T10:00:00Z").toInstant())), null));

        mockMvc.perform(run(PUBLIC_ID, "{\"version\":3,\"values\":{\"in0\":52}}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$.quota.length()").value(3))
                .andExpect(jsonPath("$.run.id").value(81))
                .andExpect(jsonPath("$.run.reports.length()").value(1))
                .andExpect(jsonPath("$.run.reports[0].length()").value(2))
                .andExpect(jsonPath("$.run.reports[0].key").value("out0"))
                .andExpect(jsonPath("$.run.reports[0].payload.values[0]").value(41.5));
    }

    /** Private, unknown and archived bookmarks, a moved or oversized one, a bad run, a failed one, a busy runtime. */
    @ParameterizedTest
    @CsvSource(delimiter = '|', value = {
            "404|Public bookmark not found",
            "409|This bookmark cannot be run publicly.",
            "422|The models could not use these values. Check the inputs and try again.",
            "502|The prediction could not be completed. Try again later.",
            "503|Too many public runs are in progress. Try again in a moment." })
    void aPublicRunThatDoesNotHappenAnswersWithItsMessageAndNothingElse(int status, String message) throws Exception {
        when(publicPredictions.run(eq(PUBLIC_ID), eq(new PublicPredictionRequest(3, Map.of())), any()))
                .thenThrow(new ResponseStatusException(HttpStatus.valueOf(status), message));

        mockMvc.perform(run(PUBLIC_ID, "{\"version\":3,\"values\":{}}"))
                .andExpect(status().is(status))
                .andExpect(jsonPath("$.length()").value(4))
                .andExpect(jsonPath("$.status").value(status))
                .andExpect(jsonPath("$.message").value(message))
                .andExpect(jsonPath("$.path").value("/api/public/bookmarks/" + PUBLIC_ID + "/predictions"))
                .andExpect(jsonPath("$.timestamp").exists());
    }

    @ParameterizedTest
    @ValueSource(strings = { "{}", "{\"version\":3}", "{\"values\":{}}" })
    void aPublicRunNeedsItsSnapshotAndItsValues(String body) throws Exception {
        mockMvc.perform(run(PUBLIC_ID, body)).andExpect(status().isBadRequest());

        verifyNoInteractions(publicPredictions);
    }

    @Test
    void aPublicRequestLargerThanAFormIsRefusedBeforeItIsRead() throws Exception {
        String oversized = "{\"version\":3,\"values\":{\"in0\":\"" + "x".repeat(64 * 1024) + "\"}}";

        mockMvc.perform(run(PUBLIC_ID, oversized))
                .andExpect(status().isPayloadTooLarge())
                .andExpect(jsonPath("$.message").value("The request is too large."));
        mockMvc.perform(post("/api/public/bookmarks/{publicId}/predictions", PUBLIC_ID)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isLengthRequired());

        verifyNoInteractions(publicPredictions);
    }

    private static SchemaBookmark stored(BookmarkVisibility visibility) {
        SchemaBookmark bookmark = bookmark();
        bookmark.setVisibility(visibility);
        bookmark.setPublicId(PUBLIC_ID);
        return bookmark;
    }

    private static MockHttpServletRequestBuilder run(String publicId, String body) {
        return post("/api/public/bookmarks/{publicId}/predictions", publicId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body);
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
