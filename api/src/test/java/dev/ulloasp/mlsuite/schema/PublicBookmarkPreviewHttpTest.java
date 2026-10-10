package dev.ulloasp.mlsuite.schema;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.OffsetDateTime;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.schema.adapter.in.web.PublicBookmarkController;
import dev.ulloasp.mlsuite.schema.application.dto.PublicBookmarkDto;
import dev.ulloasp.mlsuite.schema.application.port.in.PublicBookmarkUseCase;
import dev.ulloasp.mlsuite.schema.application.port.in.PublicPredictionUseCase;
import dev.ulloasp.mlsuite.schema.application.port.in.PublicRunUseCase;
import dev.ulloasp.mlsuite.security.SecurityConfig;

/** The page a crawler unfurls a public bookmark's link into. */
@WebMvcTest(controllers = PublicBookmarkController.class, properties = {
        "spring.profiles.active=test",
        "logging.file.name=target/public-bookmark-preview-http-test.log",
        "server.port=0",
        "cors.allow-origins=http://localhost:5173" })
@Import(SecurityConfig.class)
@MockitoBean(types = { PublicPredictionUseCase.class, PublicRunUseCase.class, RestTemplate.class,
        UserDetailsService.class })
class PublicBookmarkPreviewHttpTest {

    private static final String PUBLIC_ID = "8f6f3c0e-58a2-4c0b-9d0c-0d5c1f6e2a11";

    @Autowired
    private MockMvc mockMvc;
    @MockitoBean
    private PublicBookmarkUseCase publicBookmarks;

    @Test
    void theBookmarkIsDescribedWithOpenGraphTagsAtTheAddressTheProxyReports() throws Exception {
        when(publicBookmarks.getPublishedBookmark(PUBLIC_ID)).thenReturn(bookmark(
                "Estimates <risk> & more.", "Published in Lancet 2026.", "/api/public/organizations/3/logo?v=1"));

        mockMvc.perform(get("/api/public/bookmarks/{publicId}/preview", PUBLIC_ID)
                .header("X-Forwarded-Proto", "https").header("X-Forwarded-Host", "mlsuite.example.org"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("text/html"))
                .andExpect(content().string(containsString(
                        "<meta property=\"og:title\" content=\"production by Acme &amp; Co\">")))
                .andExpect(content().string(containsString(
                        "<meta property=\"og:description\" content=\"Estimates &lt;risk&gt; &amp; more.\">")))
                .andExpect(content().string(containsString(
                        "<meta property=\"og:url\" content=\"https://mlsuite.example.org/explore/" + PUBLIC_ID + "\">")))
                .andExpect(content().string(containsString(
                        "<meta property=\"og:image\" content=\"https://mlsuite.example.org/api/public/organizations/3/logo?v=1\">")))
                .andExpect(content().string(containsString("<meta name=\"twitter:card\" content=\"summary\">")))
                .andExpect(content().string(containsString(
                        "<meta http-equiv=\"refresh\" content=\"0; url=https://mlsuite.example.org/explore/" + PUBLIC_ID + "\">")))
                .andExpect(content().string(not(containsString("<risk>"))));
    }

    @Test
    void withoutALogoTheBrandImageStandsInAndTheNoteDescribesABookmarkWithoutDescription() throws Exception {
        when(publicBookmarks.getPublishedBookmark(PUBLIC_ID)).thenReturn(bookmark(
                null, "Published in Lancet 2026.", null));

        mockMvc.perform(get("/api/public/bookmarks/{publicId}/preview", PUBLIC_ID).header("Host", "localhost:5173"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString(
                        "<meta property=\"og:image\" content=\"http://localhost:5173/mlsuite.png\">")))
                .andExpect(content().string(containsString(
                        "<meta property=\"og:description\" content=\"Published in Lancet 2026.\">")));
    }

    @Test
    void aBookmarkWithNoTextAtAllIsStillDescribedAndALongTextIsCut() throws Exception {
        when(publicBookmarks.getPublishedBookmark(PUBLIC_ID)).thenReturn(bookmark(null, null, null));
        mockMvc.perform(get("/api/public/bookmarks/{publicId}/preview", PUBLIC_ID))
                .andExpect(content().string(containsString(
                        "<meta property=\"og:description\" content=\"Run production by Acme &amp; Co on MLSuite.\">")));

        when(publicBookmarks.getPublishedBookmark(PUBLIC_ID)).thenReturn(bookmark("word ".repeat(100), null, null));
        mockMvc.perform(get("/api/public/bookmarks/{publicId}/preview", PUBLIC_ID))
                .andExpect(content().string(containsString("word word word")))
                .andExpect(content().string(not(containsString("word ".repeat(50)))));
    }

    @Test
    void anUnknownOrPrivateBookmarkHasNoPreview() throws Exception {
        when(publicBookmarks.getPublishedBookmark(PUBLIC_ID))
                .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND, "Public bookmark not found"));

        mockMvc.perform(get("/api/public/bookmarks/{publicId}/preview", PUBLIC_ID))
                .andExpect(status().isNotFound());
    }

    private static PublicBookmarkDto bookmark(String description, String note, String logoUrl) {
        return new PublicBookmarkDto(PUBLIC_ID, "production", description, note, 1, 1, 0, "Acme & Co", logoUrl,
                Map.of(), OffsetDateTime.parse("2026-10-01T10:00:00Z"));
    }
}
