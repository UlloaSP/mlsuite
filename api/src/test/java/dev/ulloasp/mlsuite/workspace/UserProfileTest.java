package dev.ulloasp.mlsuite.workspace;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MvcResult;

import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.schema.domain.model.BookmarkVisibility;
import dev.ulloasp.mlsuite.user.domain.model.User;

/** A person editing themselves, and who gets to read the result, on the whole application. */
class UserProfileTest extends ProfileFixture {

    private static final String PROFILE = "/api/public/users/{handle}";

    @Autowired JdbcTemplate jdbc;

    @Test
    void everyFieldIsSavedAndReadBackPublicly() throws Exception {
        User ada = registered(unique("ada"));

        mockMvc.perform(editing(ada, Map.of("fullName", "  Ada King ", "bio", "Line one\r\nLine two",
                "location", "London", "website", "https://ada.example", "company", "Analytical Engines",
                "links", List.of("https://one.example", "http://two.example/a?b=c"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fullName").value("Ada King"))
                .andExpect(jsonPath("$.bio").value("Line one\nLine two"))
                .andExpect(jsonPath("$.links.length()").value(2));

        mockMvc.perform(get(PROFILE, ada.getUsername()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.handle").value(ada.getUsername()))
                .andExpect(jsonPath("$.fullName").value("Ada King"))
                .andExpect(jsonPath("$.location").value("London"))
                .andExpect(jsonPath("$.website").value("https://ada.example"))
                .andExpect(jsonPath("$.company").value("Analytical Engines"))
                .andExpect(jsonPath("$.links[1]").value("http://two.example/a?b=c"))
                .andExpect(jsonPath("$.joinedAt").exists())
                .andExpect(content().string(not(containsString(ada.getEmail()))));
        assertEquals("Ada King", personalOf(ada).getName());
    }

    @Test
    void aFieldLeftOutStaysAndABlankOneClears() throws Exception {
        User ada = registered(unique("ada"));
        edited(ada, Map.of("bio", "Hello", "location", "London", "links", List.of("https://one.example")));

        edited(ada, Map.of("bio", " ", "links", List.of()));

        mockMvc.perform(as(ada, get(ME)))
                .andExpect(jsonPath("$.bio").isEmpty())
                .andExpect(jsonPath("$.location").value("London"))
                .andExpect(jsonPath("$.links.length()").value(0));
    }

    @Test
    void whatCannotBeSavedIsRefusedWithTheReason() throws Exception {
        User ada = registered(unique("ada"));
        String tooLong = "x".repeat(300);
        for (Map<String, ?> refused : List.of(
                Map.of("fullName", " "),
                Map.of("fullName", "x".repeat(151)),
                Map.of("fullName", "Two\nlines"),
                Map.of("bio", tooLong),
                Map.of("bio", "bell\u0007"),
                Map.of("location", "x".repeat(101)),
                Map.of("location", "Two\nlines"),
                Map.of("company", "x".repeat(101)),
                Map.of("website", "javascript:alert(1)"),
                Map.of("website", "ftp://example.test"),
                Map.of("website", "https://"),
                Map.of("website", "example.test"),
                Map.of("website", "https://user:pass@example.test"),
                Map.of("website", "https://example.test/" + tooLong),
                Map.of("links", List.of("data:text/html,x")),
                Map.of("links", List.of("https://1.test", "https://2.test", "https://3.test", "https://4.test",
                        "https://5.test")))) {
            mockMvc.perform(editing(ada, refused)).andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message").isNotEmpty());
        }
    }

    @Test
    void aHandleChangeRenamesThePersonalAccountAndFreesTheOldHandle() throws Exception {
        String before = unique("ada");
        String after = unique("lovelace");
        User ada = registered(before);

        mockMvc.perform(editing(ada, Map.of("handle", after.toUpperCase())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userName").value(after));

        assertEquals(after, personalOf(ada).getSlug());
        mockMvc.perform(get(PROFILE, before)).andExpect(status().isNotFound());
        mockMvc.perform(get(PROFILE, after)).andExpect(status().isOk());
        registered(before);
    }

    @Test
    void aHandleIsRefusedWhenTakenReservedOrMalformed() throws Exception {
        User ada = registered(unique("ada"));
        User grace = registered(unique("grace"));
        String team = unique("team");
        createdOrganization(ada, "Team", team);

        mockMvc.perform(editing(ada, Map.of("handle", grace.getUsername()))).andExpect(status().isConflict());
        mockMvc.perform(editing(ada, Map.of("handle", team))).andExpect(status().isConflict());
        mockMvc.perform(editing(ada, Map.of("handle", "settings"))).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("reserved")));
        mockMvc.perform(editing(ada, Map.of("handle", "two--hyphens"))).andExpect(status().isBadRequest());
        mockMvc.perform(editing(ada, Map.of("handle", "x".repeat(40)))).andExpect(status().isBadRequest());
        assertEquals(ada.getUsername(), personalOf(ada).getSlug());
    }

    @Test
    void aPrivateUnknownOrDisabledProfileAnswersTheSameBareNotFound() throws Exception {
        User hidden = registered(unique("hidden"));
        edited(hidden, Map.of("profilePublic", false));
        User disabled = registered(unique("disabled"));
        inTransaction(() -> entityManager.find(User.class, disabled.getId()).setEnabled(false));

        byte[] unknown = notFound(PROFILE, unique("nobody")).getResponse().getContentAsByteArray();

        assertEquals(0, unknown.length);
        assertArrayEquals(unknown, notFound(PROFILE, hidden.getUsername()).getResponse().getContentAsByteArray());
        assertArrayEquals(unknown, notFound(PROFILE, disabled.getUsername()).getResponse().getContentAsByteArray());
        assertArrayEquals(unknown, notFound(PROFILE + "/bookmarks", hidden.getUsername()).getResponse()
                .getContentAsByteArray());
        assertArrayEquals(unknown, notFound(PROFILE, "not a handle!").getResponse().getContentAsByteArray());
    }

    private MvcResult notFound(String path, String handle) throws Exception {
        return mockMvc.perform(get(path, handle)).andExpect(status().isNotFound()).andReturn();
    }

    @Test
    void organizationsShowOnlyWhenTheirMemberChoosesTo() throws Exception {
        User ada = registered(unique("ada"));
        createdOrganization(ada, "Visible Works", unique("visible"));

        mockMvc.perform(get(PROFILE, ada.getUsername())).andExpect(jsonPath("$.organizations.length()").value(0));

        edited(ada, Map.of("profileShowsOrganizations", true));
        mockMvc.perform(get(PROFILE, ada.getUsername()))
                .andExpect(jsonPath("$.organizations.length()").value(1))
                .andExpect(jsonPath("$.organizations[0].name").value("Visible Works"));
    }

    @Test
    void nothingOfAPrivateBookmarkReachesTheProfileAndTheOwnerSeesRealCounts() throws Exception {
        User ada = registered(unique("ada"));
        published(ada, "shown");
        in(personalOf(ada), "secret", BookmarkVisibility.PRIVATE);

        mockMvc.perform(get(PROFILE + "/bookmarks", ada.getUsername()))
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.items[0].name").value("shown"))
                .andExpect(jsonPath("$.items[0].publisherHandle").value(ada.getUsername()))
                .andExpect(content().string(not(containsString("secret"))));

        mockMvc.perform(as(ada, get(ME + "/profile")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.profile.handle").value(ada.getUsername()))
                .andExpect(jsonPath("$.schemas").value(2))
                .andExpect(jsonPath("$.models").value(0))
                .andExpect(jsonPath("$.plugins").value(0))
                .andExpect(jsonPath("$.inferences").value(0));
    }

    @Test
    void theOwnerKeepsTheirProfileWhileItIsPrivateAndPublishersStopLinkingToIt() throws Exception {
        User ada = registered(unique("ada"));
        var bookmark = published(ada, "shown");
        edited(ada, Map.of("profilePublic", false));

        mockMvc.perform(as(ada, get(ME + "/profile"))).andExpect(status().isOk());
        mockMvc.perform(as(ada, get(ME + "/bookmarks"))).andExpect(jsonPath("$.items.length()").value(1));
        mockMvc.perform(get("/api/public/bookmarks/{id}", bookmark.getPublicId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.publisherHandle").isEmpty());
    }

    @Test
    void membersLinkToAProfileOnlyWhileItIsVisible() throws Exception {
        User ada = registered(unique("ada"));
        Organization personal = personalOf(ada);
        long team = createdOrganization(ada, "Team", unique("team"));
        String members = "/api/organizations/" + team + "/members/catalog";

        mockMvc.perform(as(ada, get(members)))
                .andExpect(jsonPath("$.items[0].profileHandle").value(ada.getUsername()));

        edited(ada, Map.of("profilePublic", false));
        mockMvc.perform(as(ada, get(members))).andExpect(jsonPath("$.items[0].profileHandle").isEmpty());
        assertEquals(personal.getSlug(), ada.getUsername());
    }

    @Test
    void anEditLeavesAnEntryThatSaysWhatChanged() throws Exception {
        User ada = registered(unique("ada"));
        String after = unique("lovelace");

        edited(ada, Map.of("bio", "Hello"));
        edited(ada, Map.of("handle", after));
        edited(ada, Map.of("bio", "Hello"));

        assertEquals(1, audited(ada, "USER_PROFILE_UPDATE"));
        String handleChange = jdbc.queryForObject("""
                SELECT metadata::text FROM audit_event WHERE action = 'USER_HANDLE_CHANGE' AND target_id = ?
                """, String.class, ada.getId().toString());
        assertEquals(Map.of("handle", Map.of("from", ada.getUsername(), "to", after)),
                objectMapper.readValue(handleChange, Map.class));
    }

    private int audited(User user, String action) {
        return jdbc.queryForObject("SELECT count(*) FROM audit_event WHERE action = ? AND target_id = ?",
                Integer.class, action, user.getId().toString());
    }
}
