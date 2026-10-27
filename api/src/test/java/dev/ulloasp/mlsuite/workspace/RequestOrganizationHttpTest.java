package dev.ulloasp.mlsuite.workspace;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import com.fasterxml.jackson.databind.JsonNode;

import dev.ulloasp.mlsuite.organization.domain.model.MembershipStatus;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationMembership;
import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.role.domain.model.RoleDefinition;
import dev.ulloasp.mlsuite.role.domain.model.RoleScope;
import dev.ulloasp.mlsuite.schema.PublicPredictionFixture;
import dev.ulloasp.mlsuite.schema.domain.model.PredictionRun;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;

/**
 * Two tabs of one member on two organizations: each request acts in the organization it names,
 * checked against the member's memberships every time, whichever one the member last selected.
 */
class RequestOrganizationHttpTest extends PublicPredictionFixture {

    private static final String HEADER = WorkspaceAccessService.ORGANIZATION_HEADER;
    private Organization other;
    private Organization stranger;

    /** The owner works in the fixture's organization in one tab, and selected another in a second tab. */
    @BeforeEach
    void aSecondTabSelectedAnotherOrganization() {
        authorizeOwner();
        inTransaction(() -> {
            other = new Organization("other-" + System.nanoTime(), "Other Lab", null, owner);
            entityManager.persist(other);
            RoleDefinition role = new RoleDefinition(other, RoleScope.ORGANIZATION, "Owner", "owner", "OWNER");
            role.setPermissions(EnumSet.allOf(PermissionKey.class));
            entityManager.persist(role);
            entityManager.persist(new OrganizationMembership(other, owner, role, MembershipStatus.ACTIVE));
            entityManager.find(User.class, owner.getId()).setCurrentOrganization(other);
            stranger = new Organization("stranger-" + System.nanoTime(), "Stranger Lab", null, owner);
            entityManager.persist(stranger);
        });
    }

    @Test
    void aRunIsPerformedAndSavedInTheOrganizationItsTabNames() throws Exception {
        String named = String.valueOf(organization.getId());

        // The bookmark is not in the organization the member last selected...
        mockMvc.perform(predict()).andExpect(status().isNotFound());
        // ...but it is in the one this tab names.
        JsonNode forest = json(mockMvc.perform(predict().header(HEADER, named)).andExpect(status().isOk()));
        JsonNode net = json(mockMvc.perform(predictNet().header(HEADER, named)).andExpect(status().isOk()));
        JsonNode saved = json(mockMvc.perform(save(forest.get("attestation").asText(), net.get("attestation").asText())
                .header(HEADER, named)).andExpect(status().isCreated()));

        PredictionRun run = entityManager.find(PredictionRun.class, saved.get("id").asLong());
        assertEquals(organization.getId(), run.getSchemaVersion().getSchema().getOrganization().getId());
    }

    @Test
    void theContextIsTheNamedOrganizationsAndWithoutAHeaderTheLastSelected() throws Exception {
        mockMvc.perform(signedIn(get("/api/workspace/context/current"), owner.getId())
                        .header(HEADER, organization.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentOrganization.id").value(organization.getId()));
        mockMvc.perform(signedIn(get("/api/workspace/context/current"), owner.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentOrganization.id").value(other.getId()));
    }

    @Test
    void anOrganizationTheMemberDoesNotBelongToIsRefusedEveryTime() throws Exception {
        mockMvc.perform(predict().header(HEADER, stranger.getId())).andExpect(status().isForbidden());
        mockMvc.perform(predict().header(HEADER, 9_999_999L)).andExpect(status().isNotFound());
        mockMvc.perform(predict().header(HEADER, "acme")).andExpect(status().isBadRequest());
        // A membership ended while the tab stayed open refuses that tab's next request.
        inTransaction(() -> entityManager.createQuery(
                "update OrganizationMembership m set m.status = :left where m.organization.id = :organization")
                .setParameter("left", MembershipStatus.REMOVED).setParameter("organization", organization.getId())
                .executeUpdate());
        mockMvc.perform(predict().header(HEADER, organization.getId())).andExpect(status().isForbidden());
    }

    @Test
    void selectingAnOrganizationAnswersForTheOneSelectedWhateverTheRequestNames() throws Exception {
        mockMvc.perform(signedIn(patch("/api/workspace/context/current"), owner.getId())
                        .header(HEADER, other.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"organizationId\":" + organization.getId() + "}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentOrganization.id").value(organization.getId()));

        assertEquals(organization.getId(), entityManager.find(User.class, owner.getId()).getCurrentOrganization().getId());
    }

    private MockHttpServletRequestBuilder predict() throws Exception {
        return prediction(forestModel.getId());
    }

    private MockHttpServletRequestBuilder predictNet() throws Exception {
        return prediction(netModel.getId());
    }

    private MockHttpServletRequestBuilder prediction(long modelId) throws Exception {
        String body = objectMapper.writeValueAsString(Map.of("schemaVersionId", version.getId(), "modelId", modelId,
                "modelInput", Map.of("age", 52)));
        return signedIn(post("/api/schema-bookmarks/{id}/predictions", bookmark.getId())
                .contentType(MediaType.APPLICATION_JSON).content(body), owner.getId());
    }

    private MockHttpServletRequestBuilder save(String... seals) throws Exception {
        String body = objectMapper.writeValueAsString(Map.of("schemaVersionId", version.getId(), "name", "tab-run",
                "inputData", Map.of("Age", 52),
                "results", List.of(seals).stream().map(seal -> Map.of("attestation", seal)).toList()));
        return signedIn(post("/api/schema-bookmarks/{id}/runs", bookmark.getId())
                .contentType(MediaType.APPLICATION_JSON).content(body), owner.getId());
    }

    private JsonNode json(org.springframework.test.web.servlet.ResultActions result) throws Exception {
        return objectMapper.readTree(result.andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8));
    }
}
