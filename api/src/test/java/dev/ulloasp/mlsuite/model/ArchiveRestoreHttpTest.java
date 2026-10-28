package dev.ulloasp.mlsuite.model;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.EnumSet;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.fasterxml.jackson.databind.JsonNode;

import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.organization.domain.model.MembershipStatus;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationMembership;
import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.role.domain.model.RoleDefinition;
import dev.ulloasp.mlsuite.role.domain.model.RoleScope;
import dev.ulloasp.mlsuite.schema.PublicPredictionFixture;
import dev.ulloasp.mlsuite.schema.domain.model.Schema;
import dev.ulloasp.mlsuite.user.domain.model.SystemRole;
import dev.ulloasp.mlsuite.user.domain.model.User;

/** Archiving a model or a schema is undone by restoring it, by a member who may edit models. */
class ArchiveRestoreHttpTest extends PublicPredictionFixture {

    @BeforeEach
    void signInTheOwner() {
        authorizeOwner();
    }

    @Test
    void anArchivedModelIsRestoredToTheActiveCatalog() throws Exception {
        JsonNode archived = json(mockMvc.perform(signedIn(post("/api/models/{id}/archive", forestModel.getId())
                .param("version", String.valueOf(forestModel.getVersion())), owner.getId())).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8));
        assertNotNull(stored(forestModel.getId()).getArchivedAt());

        mockMvc.perform(signedIn(post("/api/models/{id}/restore", forestModel.getId())
                .param("version", archived.get("version").asText()), owner.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.archivedAt").isEmpty());

        assertNull(stored(forestModel.getId()).getArchivedAt());
    }

    @Test
    void aStaleOrUnknownModelIsNotRestored() throws Exception {
        mockMvc.perform(signedIn(post("/api/models/{id}/archive", forestModel.getId())
                .param("version", String.valueOf(forestModel.getVersion())), owner.getId())).andExpect(status().isOk());

        mockMvc.perform(signedIn(post("/api/models/{id}/restore", forestModel.getId())
                .param("version", String.valueOf(forestModel.getVersion())), owner.getId()))
                .andExpect(status().isConflict());
        mockMvc.perform(signedIn(post("/api/models/{id}/restore", 9_999_999L).param("version", "0"), owner.getId()))
                .andExpect(status().isNotFound());
        assertNotNull(stored(forestModel.getId()).getArchivedAt());
    }

    @Test
    void anArchivedSchemaIsRestoredToTheActiveCatalog() throws Exception {
        mockMvc.perform(signedIn(post("/api/schemas/{id}/archive", schema.getId()), owner.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.archivedAt").isNotEmpty());

        mockMvc.perform(signedIn(post("/api/schemas/{id}/restore", schema.getId()), owner.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.archivedAt").isEmpty());

        entityManager.clear();
        assertNull(entityManager.find(Schema.class, schema.getId()).getArchivedAt());
    }

    @Test
    void aMemberWhoMayNotEditModelsRestoresNothing() throws Exception {
        long viewer = viewer();
        inTransaction(() -> entityManager.find(Model.class, forestModel.getId()).setArchivedAt(OffsetDateTime.now()));

        mockMvc.perform(signedIn(post("/api/models/{id}/restore", forestModel.getId()).param("version", "1"), viewer))
                .andExpect(status().isForbidden());
        mockMvc.perform(signedIn(post("/api/schemas/{id}/restore", schema.getId()), viewer))
                .andExpect(status().isForbidden());
        assertNotNull(stored(forestModel.getId()).getArchivedAt());
    }

    private long viewer() {
        long[] id = new long[1];
        inTransaction(() -> {
            String unique = "viewer" + System.nanoTime();
            User user = new User(unique, unique + "@example.test", "unused", "Viewer", SystemRole.USER);
            entityManager.persist(user);
            RoleDefinition role = new RoleDefinition(organization, RoleScope.ORGANIZATION, "Viewer", unique, null);
            role.setPermissions(EnumSet.of(PermissionKey.VIEW_MODELS));
            entityManager.persist(role);
            entityManager.persist(new OrganizationMembership(organization, user, role, MembershipStatus.ACTIVE));
            user.setCurrentOrganization(organization);
            id[0] = user.getId();
        });
        return id[0];
    }

    private Model stored(Long modelId) {
        entityManager.clear();
        return entityManager.find(Model.class, modelId);
    }

    private JsonNode json(String body) throws Exception {
        return objectMapper.readTree(body);
    }
}
