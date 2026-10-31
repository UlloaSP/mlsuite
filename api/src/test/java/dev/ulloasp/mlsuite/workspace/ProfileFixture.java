package dev.ulloasp.mlsuite.workspace;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.schema.domain.model.BookmarkVisibility;
import dev.ulloasp.mlsuite.schema.domain.model.Schema;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaVersion;
import dev.ulloasp.mlsuite.user.domain.model.User;

/** People with something to show: their profile edits, and bookmarks in their personal account. */
abstract class ProfileFixture extends PersonalAccountFixture {

    static final String ME = "/api/users/me";
    static final String PINS = ME + "/pins";

    MockHttpServletRequestBuilder editing(User user, Map<String, ?> changes) {
        return as(user, patch(ME)).contentType(MediaType.APPLICATION_JSON).content(json(changes));
    }

    void edited(User user, Map<String, ?> changes) throws Exception {
        mockMvc.perform(editing(user, changes)).andExpect(status().isOk());
    }

    SchemaBookmark published(User user, String name) {
        return in(personalOf(user), name, BookmarkVisibility.PUBLIC);
    }

    SchemaBookmark in(Organization account, String name, BookmarkVisibility visibility) {
        AtomicReference<SchemaBookmark> stored = new AtomicReference<>();
        inTransaction(() -> {
            Schema owned = new Schema(account, name + " schema", null);
            entityManager.persist(owned);
            SchemaVersion snapshot = new SchemaVersion(owned, 1, "First",
                    Map.of("fields", List.of(), "reports", List.of()));
            entityManager.persist(snapshot);
            SchemaBookmark bookmark = new SchemaBookmark(owned, snapshot, name);
            bookmark.setDescription("Private note of " + name);
            bookmark.setVisibility(visibility);
            bookmark.setPublicId(UUID.randomUUID().toString());
            entityManager.persist(bookmark);
            stored.set(bookmark);
        });
        return stored.get();
    }
}
