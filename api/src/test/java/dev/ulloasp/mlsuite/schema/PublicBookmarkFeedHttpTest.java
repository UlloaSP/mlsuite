package dev.ulloasp.mlsuite.schema;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.OffsetDateTime;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.client.RestTemplate;

import dev.ulloasp.mlsuite.schema.adapter.in.web.PublicBookmarkController;
import dev.ulloasp.mlsuite.schema.application.dto.PublicBookmarkSummaryDto;
import dev.ulloasp.mlsuite.schema.application.port.in.PublicBookmarkUseCase;
import dev.ulloasp.mlsuite.schema.application.port.in.PublicPredictionUseCase;
import dev.ulloasp.mlsuite.schema.application.port.in.PublicRunUseCase;
import dev.ulloasp.mlsuite.security.SecurityConfig;
import dev.ulloasp.mlsuite.util.PageDto;

/** The public feed listing behind the real security filter chain. */
@WebMvcTest(controllers = PublicBookmarkController.class, properties = {
        "spring.profiles.active=test",
        "logging.file.name=target/public-bookmark-feed-http-test.log",
        "server.port=0",
        "cors.allow-origins=http://localhost:5173" })
@Import(SecurityConfig.class)
@MockitoBean(types = { PublicPredictionUseCase.class, PublicRunUseCase.class, RestTemplate.class,
        UserDetailsService.class })
class PublicBookmarkFeedHttpTest {

    private static final String PUBLIC_ID = "8f6f3c0e-58a2-4c0b-9d0c-0d5c1f6e2a11";

    @Autowired
    private MockMvc mockMvc;
    @MockitoBean
    private PublicBookmarkUseCase publicBookmarks;

    @Test
    void anonymousVisitorsListPublishedBookmarksWithoutInternalFields() throws Exception {
        when(publicBookmarks.getPublishedBookmarkPage(0, 24, "", "updated")).thenReturn(new PageDto<>(
                List.of(new PublicBookmarkSummaryDto(PUBLIC_ID, "production", "Estimates risk.", 16, 2, "Org",
                        "/api/public/organizations/3/logo?v=1", OffsetDateTime.parse("2026-10-01T10:00:00Z"))),
                0, 24, 1, false));

        mockMvc.perform(get("/api/public/bookmarks"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(5))
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(24))
                .andExpect(jsonPath("$.totalItems").value(1))
                .andExpect(jsonPath("$.hasNext").value(false))
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.items[0].length()").value(8))
                .andExpect(jsonPath("$.items[0].publicId").value(PUBLIC_ID))
                .andExpect(jsonPath("$.items[0].name").value("production"))
                .andExpect(jsonPath("$.items[0].description").value("Estimates risk."))
                .andExpect(jsonPath("$.items[0].inputCount").value(16))
                .andExpect(jsonPath("$.items[0].reportCount").value(2))
                .andExpect(jsonPath("$.items[0].organizationName").value("Org"))
                .andExpect(jsonPath("$.items[0].organizationLogoUrl").value("/api/public/organizations/3/logo?v=1"))
                .andExpect(jsonPath("$.items[0].updatedAt").exists())
                .andExpect(jsonPath("$.items[0].id").doesNotExist())
                .andExpect(jsonPath("$.items[0].schemaId").doesNotExist())
                .andExpect(jsonPath("$.items[0].schemaName").doesNotExist())
                .andExpect(jsonPath("$.items[0].schemaDescription").doesNotExist())
                .andExpect(jsonPath("$.items[0].version").doesNotExist())
                .andExpect(jsonPath("$.items[0].versionName").doesNotExist())
                .andExpect(jsonPath("$.items[0].versionId").doesNotExist())
                .andExpect(jsonPath("$.items[0].formSchema").doesNotExist());
    }

    @Test
    void theListingPassesPagingSearchAndSortToTheUseCase() throws Exception {
        when(publicBookmarks.getPublishedBookmarkPage(2, 10, "risk", "name"))
                .thenReturn(new PageDto<>(List.of(), 2, 10, 0, false));

        mockMvc.perform(get("/api/public/bookmarks")
                .param("page", "2").param("size", "10").param("search", "risk").param("sort", "name"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(0));

        verify(publicBookmarks).getPublishedBookmarkPage(2, 10, "risk", "name");
    }
}
