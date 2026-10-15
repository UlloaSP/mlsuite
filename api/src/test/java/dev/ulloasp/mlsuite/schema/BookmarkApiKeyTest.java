package dev.ulloasp.mlsuite.schema;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.function.Supplier;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import com.fasterxml.jackson.databind.JsonNode;

import dev.ulloasp.mlsuite.organization.domain.model.MembershipStatus;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationMembership;
import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.role.domain.model.RoleDefinition;
import dev.ulloasp.mlsuite.role.domain.model.RoleScope;
import dev.ulloasp.mlsuite.schema.application.port.in.SchemaCatalogUseCase;
import dev.ulloasp.mlsuite.schema.domain.model.BookmarkApiKey;
import dev.ulloasp.mlsuite.schema.domain.model.BookmarkVisibility;
import dev.ulloasp.mlsuite.schema.domain.model.Schema;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaVersion;
import dev.ulloasp.mlsuite.storage.ArtifactHash;
import dev.ulloasp.mlsuite.user.domain.model.SystemRole;
import dev.ulloasp.mlsuite.user.domain.model.User;

/**
 * Issuing, listing and revoking a bookmark's API keys over HTTP, as a member who may publish:
 * what is stored, what is shown, and who is refused. ConsumerPredictionTest runs with the keys.
 */
class BookmarkApiKeyTest extends PublicPredictionFixture {

    @Autowired SchemaCatalogUseCase schemas;

    @BeforeEach
    void makeTheOwnerAMember() {
        authorizeOwner();
    }

    @Test
    void anIssuedKeyShowsItsSecretOnceAndIsStoredOnlyAsItsHash() throws Exception {
        JsonNode issued = issue(bookmark.getId(), "  Lab2Pressure  ");

        String secret = issued.get("secret").asText();
        assertTrue(secret.matches("mls_[A-Za-z0-9_-]{43}"), secret);
        assertEquals("Lab2Pressure", issued.at("/key/name").asText());
        assertEquals(secret.substring(0, 12), issued.at("/key/prefix").asText());
        assertEquals("Owner", issued.at("/key/createdByName").asText());
        assertTrue(issued.at("/key/lastUsedAt").isNull());
        BookmarkApiKey stored = entityManager.find(BookmarkApiKey.class, issued.at("/key/id").asLong());
        assertEquals(ArtifactHash.sha256(secret.getBytes(StandardCharsets.UTF_8)), stored.getKeyHash());
        assertEquals(secret.substring(0, 12), stored.getKeyPrefix());

        issue(bookmark.getId(), "Second consumer");
        String listed = mockMvc.perform(member(get("/api/schema-bookmarks/{id}/api-keys", bookmark.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].name").value("Lab2Pressure"))
                .andExpect(jsonPath("$[0].length()").value(6))
                .andExpect(jsonPath("$[1].name").value("Second consumer"))
                .andReturn().getResponse().getContentAsString();
        assertFalse(listed.contains(secret));
    }

    @Test
    void aKeyMayBeIssuedOnAPrivateBookmarkAndOutlivesUnpublishing() throws Exception {
        inTransaction(() -> entityManager.find(SchemaBookmark.class, bookmark.getId())
                .setVisibility(BookmarkVisibility.PRIVATE));

        issue(bookmark.getId(), "Lab2Pressure");
        mockMvc.perform(member(post("/api/schema-bookmarks/{id}/publish", bookmark.getId()))).andExpect(status().isOk());
        mockMvc.perform(member(post("/api/schema-bookmarks/{id}/unpublish", bookmark.getId()))).andExpect(status().isOk());

        mockMvc.perform(member(get("/api/schema-bookmarks/{id}/api-keys", bookmark.getId())))
                .andExpect(jsonPath("$.length()").value(1));
    }

    @ParameterizedTest
    @ValueSource(strings = { "{}", "{\"name\":\"   \"}", "{\"name\":null}", "LONG" })
    void aKeyNeedsANameOfAtMostEightyCharacters(String body) throws Exception {
        String sent = body.equals("LONG") ? "{\"name\":\"" + "x".repeat(81) + "\"}" : body;

        mockMvc.perform(member(creating(bookmark.getId(), sent))).andExpect(status().isBadRequest());

        assertEquals(0, keysOf(bookmark));
        issue(bookmark.getId(), "x".repeat(80));
    }

    @Test
    void aBookmarkHasOneKeyPerNameWhateverItsCase() throws Exception {
        issue(bookmark.getId(), "Lab2Pressure");

        mockMvc.perform(member(creating(bookmark.getId(), "{\"name\":\" lab2PRESSURE \"}")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("This bookmark already has a key named \"lab2PRESSURE\"."));
    }

    @Test
    void aRevokedKeyIsGoneAndOnlyItsOwnBookmarkRevokesIt() throws Exception {
        long keyId = issue(bookmark.getId(), "Lab2Pressure").at("/key/id").asLong();
        SchemaBookmark other = inTransactionReturning(() -> {
            SchemaBookmark created = new SchemaBookmark(entityManager.find(Schema.class, schema.getId()),
                    entityManager.find(SchemaVersion.class, version.getId()), "staging");
            entityManager.persist(created);
            return created;
        });

        mockMvc.perform(member(delete("/api/schema-bookmarks/{id}/api-keys/{keyId}", other.getId(), keyId)))
                .andExpect(status().isNotFound());
        mockMvc.perform(member(delete("/api/schema-bookmarks/{id}/api-keys/{keyId}", bookmark.getId(), keyId)))
                .andExpect(status().isNoContent());
        mockMvc.perform(member(delete("/api/schema-bookmarks/{id}/api-keys/{keyId}", bookmark.getId(), keyId)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("API key not found"));
        assertEquals(0, keysOf(bookmark));
    }

    @Test
    void keysLeaveWithTheirBookmark() throws Exception {
        issue(bookmark.getId(), "Lab2Pressure");

        schemas.deleteSchema(owner.getId(), schema.getId());

        assertEquals(0, keysOf(bookmark));
    }

    @Test
    void keysAreManagedOnlyBySignedInMembersWhoMayPublishBookmarksOfTheirOrganization() throws Exception {
        mockMvc.perform(get("/api/schema-bookmarks/{id}/api-keys", bookmark.getId())).andExpect(status().isUnauthorized());
        mockMvc.perform(creating(bookmark.getId(), "{\"name\":\"x\"}")).andExpect(status().isUnauthorized());
        mockMvc.perform(delete("/api/schema-bookmarks/{id}/api-keys/1", bookmark.getId()))
                .andExpect(status().isUnauthorized());

        User viewer = inTransactionReturning(() -> {
            User user = new User("viewer-" + bookmark.getId(), "viewer-" + bookmark.getId() + "@example.test",
                    "unused", "Viewer", SystemRole.USER);
            entityManager.persist(user);
            RoleDefinition role = new RoleDefinition(organization, RoleScope.ORGANIZATION, "No publishing",
                    "no-publishing", null);
            role.setPermissions(EnumSet.complementOf(EnumSet.of(PermissionKey.PUBLISH_BOOKMARKS)));
            entityManager.persist(role);
            entityManager.persist(new OrganizationMembership(organization, user, role, MembershipStatus.ACTIVE));
            user.setCurrentOrganization(organization);
            return user;
        });
        mockMvc.perform(signedIn(get("/api/schema-bookmarks/{id}/api-keys", bookmark.getId()), viewer.getId()))
                .andExpect(status().isForbidden());
        mockMvc.perform(signedIn(creating(bookmark.getId(), "{\"name\":\"x\"}"), viewer.getId()))
                .andExpect(status().isForbidden());

        SchemaBookmark foreign = inTransactionReturning(() -> {
            Organization elsewhere = new Organization("elsewhere-" + bookmark.getId(), "Elsewhere", null, owner);
            entityManager.persist(elsewhere);
            Schema foreignSchema = new Schema(elsewhere, "Foreign", null);
            entityManager.persist(foreignSchema);
            SchemaVersion foreignVersion = new SchemaVersion(foreignSchema, 1, "Foreign", Map.of("fields", List.of()));
            entityManager.persist(foreignVersion);
            SchemaBookmark created = new SchemaBookmark(foreignSchema, foreignVersion, "foreign");
            entityManager.persist(created);
            return created;
        });
        mockMvc.perform(member(get("/api/schema-bookmarks/{id}/api-keys", foreign.getId())))
                .andExpect(status().isNotFound());
        mockMvc.perform(member(creating(foreign.getId(), "{\"name\":\"x\"}"))).andExpect(status().isNotFound());
        assertEquals(0, keysOf(foreign));
    }

    private JsonNode issue(Long bookmarkId, String name) throws Exception {
        String body = mockMvc.perform(member(creating(bookmarkId, objectMapper.writeValueAsString(Map.of("name", name)))))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body);
    }

    private static MockHttpServletRequestBuilder creating(Long bookmarkId, String body) {
        return post("/api/schema-bookmarks/{id}/api-keys", bookmarkId).contentType(MediaType.APPLICATION_JSON).content(body);
    }

    private long keysOf(SchemaBookmark target) {
        return entityManager.createQuery("select count(k) from BookmarkApiKey k where k.bookmark.id = :id", Long.class)
                .setParameter("id", target.getId()).getSingleResult();
    }

    private MockHttpServletRequestBuilder member(MockHttpServletRequestBuilder request) {
        return signedIn(request, owner.getId());
    }

    private <T> T inTransactionReturning(Supplier<T> work) {
        Object[] made = new Object[1];
        inTransaction(() -> made[0] = work.get());
        @SuppressWarnings("unchecked")
        T result = (T) made[0];
        return result;
    }
}
