package dev.ulloasp.mlsuite.workspace;

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

import dev.ulloasp.mlsuite.schema.domain.model.BookmarkVisibility;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;
import dev.ulloasp.mlsuite.user.domain.model.User;

/** Pins are chosen from a person's own published bookmarks and never outlive one. */
class ProfilePinTest extends ProfileFixture {

    private ResultActions pin(User user, String... publicIds) throws Exception {
        return mockMvc.perform(as(user, put(PINS)).contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("publicIds", List.of(publicIds)))));
    }

    private ResultActions profile(User user) throws Exception {
        return mockMvc.perform(get("/api/public/users/{handle}", user.getUsername()));
    }

    private long pins(User user) {
        return entityManager.createQuery("select count(p) from ProfilePin p where p.userId = :id", Long.class)
                .setParameter("id", user.getId()).getSingleResult();
    }

    @Test
    void pinsAreShownFirstInTheChosenOrderAndLeaveTheRestOfTheList() throws Exception {
        User ada = registered(unique("ada"));
        SchemaBookmark first = published(ada, "first");
        SchemaBookmark second = published(ada, "second");
        published(ada, "third");

        pin(ada, second.getPublicId(), first.getPublicId())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.profile.pinned[0].name").value("second"));

        profile(ada).andExpect(jsonPath("$.pinned[0].name").value("second"))
                .andExpect(jsonPath("$.pinned[1].name").value("first"));
        mockMvc.perform(get("/api/public/users/{handle}/bookmarks", ada.getUsername()))
                .andExpect(jsonPath("$.totalItems").value(1))
                .andExpect(jsonPath("$.items[0].name").value("third"));
    }

    @Test
    void reorderingAndDroppingPinsReplacesTheWholeList() throws Exception {
        User ada = registered(unique("ada"));
        SchemaBookmark first = published(ada, "first");
        SchemaBookmark second = published(ada, "second");
        pin(ada, first.getPublicId(), second.getPublicId()).andExpect(status().isOk());

        pin(ada, second.getPublicId(), first.getPublicId()).andExpect(status().isOk());
        profile(ada).andExpect(jsonPath("$.pinned[0].name").value("second"));

        pin(ada, first.getPublicId()).andExpect(status().isOk());
        profile(ada).andExpect(jsonPath("$.pinned.length()").value(1));

        pin(ada).andExpect(status().isOk());
        assertEquals(0, pins(ada));
    }

    @Test
    void sixIsTheMost() throws Exception {
        User ada = registered(unique("ada"));
        String[] ids = IntStream.range(0, 7).mapToObj(n -> published(ada, "b" + n).getPublicId())
                .toArray(String[]::new);

        pin(ada, ids).andExpect(status().isBadRequest());
        pin(ada, List.of(ids).subList(0, 6).toArray(String[]::new)).andExpect(status().isOk());
        assertEquals(6, pins(ada));
    }

    @Test
    void onlyTheirOwnPublishedBookmarksCanBePinned() throws Exception {
        User ada = registered(unique("ada"));
        User grace = registered(unique("grace"));
        SchemaBookmark theirs = published(grace, "theirs");
        SchemaBookmark hidden = in(personalOf(ada), "hidden", BookmarkVisibility.PRIVATE);

        for (String refused : List.of(theirs.getPublicId(), hidden.getPublicId(), bookmark.getPublicId(), "unknown")) {
            pin(ada, refused).andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message").value(containsString("own published")));
        }
        assertEquals(0, pins(ada));
    }

    @Test
    void unpublishingRemovesThePinAndPublishingAgainDoesNotRestoreIt() throws Exception {
        User ada = registered(unique("ada"));
        SchemaBookmark shown = published(ada, "shown");
        pin(ada, shown.getPublicId()).andExpect(status().isOk());

        mockMvc.perform(as(ada, post("/api/schema-bookmarks/{id}/unpublish", shown.getId())))
                .andExpect(status().isOk());
        assertEquals(0, pins(ada));

        mockMvc.perform(as(ada, post("/api/schema-bookmarks/{id}/publish", shown.getId())))
                .andExpect(status().isOk());
        profile(ada).andExpect(jsonPath("$.pinned.length()").value(0));
    }

    @Test
    void moderationRemovesThePin() throws Exception {
        User ada = registered(unique("ada"));
        User admin = registered(unique("admin"));
        SchemaBookmark shown = published(ada, "shown");
        pin(ada, shown.getPublicId()).andExpect(status().isOk());

        mockMvc.perform(asSuperadmin(admin, post("/api/admin/public-bookmarks/{id}/unpublish", shown.getId())))
                .andExpect(status().isOk());

        assertEquals(0, pins(ada));
    }

    @Test
    void archivingAndDeletingTheSchemaRemoveThePin() throws Exception {
        User ada = registered(unique("ada"));
        SchemaBookmark archived = published(ada, "archived");
        SchemaBookmark deleted = published(ada, "deleted");
        pin(ada, archived.getPublicId(), deleted.getPublicId()).andExpect(status().isOk());

        mockMvc.perform(as(ada, post("/api/schemas/{id}/archive", archived.getSchema().getId())))
                .andExpect(status().isOk());
        assertEquals(1, pins(ada));

        mockMvc.perform(as(ada, delete("/api/schemas/{id}", deleted.getSchema().getId())))
                .andExpect(status().is2xxSuccessful());
        assertEquals(0, pins(ada));
    }

    @Test
    void deletingABookmarkRemovesItsPin() throws Exception {
        User ada = registered(unique("ada"));
        SchemaBookmark shown = published(ada, "shown");
        pin(ada, shown.getPublicId()).andExpect(status().isOk());

        mockMvc.perform(as(ada, delete("/api/schema-bookmarks/{id}", shown.getId())))
                .andExpect(status().is2xxSuccessful());

        assertEquals(0, pins(ada));
        profile(ada).andExpect(jsonPath("$.pinned.length()").value(0));
    }

    @Test
    void aChangeOfPinsIsAudited() throws Exception {
        User ada = registered(unique("ada"));
        SchemaBookmark shown = published(ada, "shown");

        pin(ada, shown.getPublicId()).andExpect(status().isOk());
        pin(ada, shown.getPublicId()).andExpect(status().isOk());

        assertEquals(1L, entityManager.createNativeQuery("""
                SELECT count(*) FROM audit_event WHERE action = 'USER_PROFILE_UPDATE' AND target_id = :id
                """).setParameter("id", ada.getId().toString()).getSingleResult());
    }
}
