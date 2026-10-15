package dev.ulloasp.mlsuite.apiaccess;

import static org.hamcrest.Matchers.contains;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.EnumSet;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import com.fasterxml.jackson.databind.JsonNode;

import dev.ulloasp.mlsuite.apiaccess.domain.model.ApiClient;
import dev.ulloasp.mlsuite.apiaccess.domain.model.ApiClientKey;
import dev.ulloasp.mlsuite.organization.domain.model.MembershipStatus;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationMembership;
import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.role.domain.model.RoleDefinition;
import dev.ulloasp.mlsuite.role.domain.model.RoleScope;
import dev.ulloasp.mlsuite.schema.application.port.in.SchemaCatalogUseCase;
import dev.ulloasp.mlsuite.schema.domain.model.BookmarkVisibility;
import dev.ulloasp.mlsuite.schema.domain.model.SchemaBookmark;
import dev.ulloasp.mlsuite.storage.ArtifactHash;
import dev.ulloasp.mlsuite.user.domain.model.SystemRole;
import dev.ulloasp.mlsuite.user.domain.model.User;

/**
 * Creating, naming and deleting clients, issuing and revoking their keys and giving them
 * bookmarks, over HTTP: what is stored, what members see, what each change leaves in the audit
 * log, and who is refused.
 */
class ApiClientManagementTest extends ApiAccessFixture {

    @Autowired SchemaCatalogUseCase schemas;

    @Test
    void aClientIsNamedOncePerOrganizationWhateverItsCase() throws Exception {
        JsonNode created = send(post("/api/api-clients"), Map.of("name", "  Edge  ", "description", "  "), 201);
        assertEquals("Edge", created.at("/client/name").asText());
        assertTrue(created.at("/client/description").isNull());
        assertEquals("ACTIVE", created.at("/client/status").asText());
        assertEquals("Owner", created.at("/client/createdByName").asText());

        mockMvc.perform(member(json(post("/api/api-clients"), Map.of("name", "lab2PRESSURE"))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("This organization already has a client named \"lab2PRESSURE\"."));
        long id = created.at("/client/id").asLong();
        send(patch("/api/api-clients/{id}", id), Map.of("name", "Edge gateway", "description", "Billing"), 200);
        mockMvc.perform(member(get("/api/api-clients").param("search", "billing")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.items[0].name").value("Edge gateway"))
                .andExpect(jsonPath("$.items[0].keyCount").value(0));
        assertEquals(2, auditEvents("API_CLIENT_CREATE"));
        assertEquals(1, auditEvents("API_CLIENT_UPDATE"));
    }

    @ParameterizedTest
    @ValueSource(strings = { "{}", "{\"name\":\"   \"}", "LONG_NAME", "LONG_DESCRIPTION" })
    void aClientNeedsANameOfAtMostEightyCharactersAndANoteOfAtMostFourHundred(String body) throws Exception {
        String sent = switch (body) {
            case "LONG_NAME" -> "{\"name\":\"" + "x".repeat(81) + "\"}";
            case "LONG_DESCRIPTION" -> "{\"name\":\"Edge\",\"description\":\"" + "x".repeat(401) + "\"}";
            default -> body;
        };

        mockMvc.perform(member(post("/api/api-clients").contentType(MediaType.APPLICATION_JSON).content(sent)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void anIssuedKeyShowsItsSecretOnceAndIsStoredOnlyAsItsHash() throws Exception {
        JsonNode issued = send(post("/api/api-clients/{id}/keys", clientId), Map.of("name", " Staging "), 201);

        String issuedSecret = issued.get("secret").asText();
        assertTrue(issuedSecret.matches("mls_[A-Za-z0-9_-]{43}"), issuedSecret);
        assertEquals("Staging", issued.at("/key/name").asText());
        assertEquals(issuedSecret.substring(0, 12), issued.at("/key/prefix").asText());
        ApiClientKey stored = entityManager.find(ApiClientKey.class, issued.at("/key/id").asLong());
        assertEquals(ArtifactHash.sha256(issuedSecret.getBytes(StandardCharsets.UTF_8)), stored.getKeyHash());

        String detail = mockMvc.perform(member(get("/api/api-clients/{id}", clientId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.keys.length()").value(2))
                .andExpect(jsonPath("$.keys[1].name").value("Staging"))
                .andExpect(jsonPath("$.client.keyCount").value(2))
                .andReturn().getResponse().getContentAsString();
        assertFalse(detail.contains(issuedSecret));
        assertEquals(2, auditEvents("API_KEY_ISSUE"));
    }

    @Test
    void aRevokedKeyIsGoneAndOnlyItsOwnClientRevokesIt() throws Exception {
        long keyId = keyNamed("Production").getId();
        long other = send(post("/api/api-clients"), Map.of("name", "Edge"), 201).at("/client/id").asLong();

        mockMvc.perform(member(delete("/api/api-clients/{id}/keys/{keyId}", other, keyId)))
                .andExpect(status().isNotFound());
        mockMvc.perform(member(delete("/api/api-clients/{id}/keys/{keyId}", clientId, keyId)))
                .andExpect(status().isNoContent());
        mockMvc.perform(member(delete("/api/api-clients/{id}/keys/{keyId}", clientId, keyId)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("API key not found"));
        mockMvc.perform(predicting(secret, FEATURES)).andExpect(status().isUnauthorized());
        assertEquals(1, auditEvents("API_KEY_REVOKE"));
    }

    @Test
    void aBookmarkGivenToAClientGetsItsIdAndShowsWhetherClientsCanRunIt() throws Exception {
        SchemaBookmark stored = entityManager.find(SchemaBookmark.class, single.getId());
        assertEquals(apiId, stored.getPublicId());
        assertEquals(BookmarkVisibility.PRIVATE, stored.getVisibility());

        JsonNode given = send(put("/api/api-clients/{id}/bookmarks/{bookmarkId}", clientId, bookmark.getId()), null, 200);
        assertEquals(2, given.at("/client/bookmarkCount").asInt());
        mockMvc.perform(member(get("/api/api-access/bookmarks")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.name == 'consumers')].refusal").value(contains(
                        (Object) null)))
                .andExpect(jsonPath("$[?(@.name == 'consumers')].modelName").value(
                        contains("risk-forest")))
                .andExpect(jsonPath("$[?(@.name == 'production')].refusal").value(contains(
                        "Its snapshot binds 2 models; clients run a bookmark of exactly one model.")))
                .andExpect(jsonPath("$[?(@.name == 'production')].clientNames[0]").value(contains("Lab2Pressure")));

        send(delete("/api/api-clients/{id}/bookmarks/{bookmarkId}", clientId, bookmark.getId()), null, 200);
        assertEquals(1, auditEvents("API_ACCESS_REVOKE"));
        assertEquals(2, auditEvents("API_ACCESS_GRANT"));
    }

    @Test
    void aSuspendedClientTakesNoNewKeyOrBookmarkButLosesThemFreely() throws Exception {
        inTransaction(() -> entityManager.find(ApiClient.class, clientId).suspend("Abuse", OffsetDateTime.now()));

        mockMvc.perform(member(json(post("/api/api-clients/{id}/keys", clientId), Map.of("name", "x"))))
                .andExpect(status().isConflict());
        mockMvc.perform(member(put("/api/api-clients/{id}/bookmarks/{bookmarkId}", clientId, bookmark.getId())))
                .andExpect(status().isConflict());
        mockMvc.perform(member(get("/api/api-clients/{id}", clientId)))
                .andExpect(jsonPath("$.client.status").value("SUSPENDED"))
                .andExpect(jsonPath("$.client.suspensionReason").value("Abuse"));
        mockMvc.perform(member(delete("/api/api-clients/{id}/keys/{keyId}", clientId, keyNamed("Production").getId())))
                .andExpect(status().isNoContent());
    }

    @Test
    void aDeletedClientsCallsStayLoggedUnderItsName() throws Exception {
        mockMvc.perform(predicting(secret, FEATURES)).andExpect(status().isOk());

        mockMvc.perform(member(delete("/api/api-clients/{id}", clientId))).andExpect(status().isNoContent());

        assertNull(entityManager.find(ApiClient.class, clientId));
        assertNull(calls().getFirst().getClientId());
        assertEquals("Lab2Pressure", calls().getFirst().getClientName());
        mockMvc.perform(predicting(secret, FEATURES)).andExpect(status().isUnauthorized());
        assertEquals(1, auditEvents("API_CLIENT_DELETE"));
    }

    @Test
    void aDeletedBookmarkLeavesItsClients() throws Exception {
        schemas.deleteSchema(owner.getId(), schema.getId());

        mockMvc.perform(member(get("/api/api-clients/{id}", clientId)))
                .andExpect(jsonPath("$.bookmarks.length()").value(0))
                .andExpect(jsonPath("$.client.bookmarkCount").value(0));
    }

    @Test
    void membersWhoMayViewReadClientsAndOnlyThoseWhoMayManageChangeThem() throws Exception {
        mockMvc.perform(get("/api/api-clients")).andExpect(status().isUnauthorized());

        long viewer = memberWith(EnumSet.of(PermissionKey.VIEW_WORKSPACE, PermissionKey.VIEW_API_ACCESS));
        mockMvc.perform(signedIn(get("/api/api-clients/{id}", clientId), viewer)).andExpect(status().isOk());
        mockMvc.perform(signedIn(get("/api/api-access/usage"), viewer)).andExpect(status().isOk());
        mockMvc.perform(signedIn(json(post("/api/api-clients/{id}/keys", clientId), Map.of("name", "x")), viewer))
                .andExpect(status().isForbidden());
        long outsider = memberWith(EnumSet.of(PermissionKey.VIEW_WORKSPACE, PermissionKey.VIEW_MODELS));
        mockMvc.perform(signedIn(get("/api/api-clients"), outsider)).andExpect(status().isForbidden());
        mockMvc.perform(signedIn(get("/api/api-access/requests"), outsider)).andExpect(status().isForbidden());

        Long foreign = inTransactionReturning(() -> {
            Organization elsewhere = new Organization("elsewhere-" + clientId, "Elsewhere", null, owner);
            entityManager.persist(elsewhere);
            ApiClient client = new ApiClient(elsewhere, "Foreign", null, "Owner");
            entityManager.persist(client);
            return client.getId();
        });
        mockMvc.perform(member(get("/api/api-clients/{id}", foreign))).andExpect(status().isNotFound());
        mockMvc.perform(member(delete("/api/api-clients/{id}", foreign))).andExpect(status().isNotFound());
    }

    private long memberWith(EnumSet<PermissionKey> permissions) {
        return inTransactionReturning(() -> {
            String name = "member-" + System.nanoTime();
            User user = new User(name, name + "@example.test", "unused", "Member", SystemRole.USER);
            entityManager.persist(user);
            RoleDefinition role = new RoleDefinition(organization, RoleScope.ORGANIZATION, name, name, null);
            role.setPermissions(permissions);
            entityManager.persist(role);
            entityManager.persist(new OrganizationMembership(organization, user, role, MembershipStatus.ACTIVE));
            user.setCurrentOrganization(organization);
            return user.getId();
        });
    }

    private JsonNode send(MockHttpServletRequestBuilder request, Map<String, Object> body, int expected)
            throws Exception {
        String answer = mockMvc.perform(member(body == null ? request : json(request, body)))
                .andExpect(status().is(expected))
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(answer);
    }

    private MockHttpServletRequestBuilder json(MockHttpServletRequestBuilder request, Map<String, Object> body)
            throws Exception {
        return request.contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(body));
    }

    private long auditEvents(String action) {
        return entityManager.createQuery(
                "select count(e) from AuditEvent e where e.organization.id = :id and e.action = :action", Long.class)
                .setParameter("id", organization.getId()).setParameter("action", action).getSingleResult();
    }
}
