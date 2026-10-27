package dev.ulloasp.mlsuite.invitation;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.fasterxml.jackson.databind.JsonNode;

import dev.ulloasp.mlsuite.invitation.domain.model.Invitation;
import dev.ulloasp.mlsuite.organization.domain.model.MembershipStatus;
import dev.ulloasp.mlsuite.role.domain.model.RoleDefinition;
import dev.ulloasp.mlsuite.schema.PublicPredictionFixture;
import dev.ulloasp.mlsuite.user.domain.model.SystemRole;
import dev.ulloasp.mlsuite.user.domain.model.User;

/**
 * Joining an organization takes its invitation link. MLsuite verifies no email address, so an
 * account registered with an invited address before its owner does reads the invitation but
 * cannot join: only the link, which the inviter sends to the person, carries the token.
 */
class InvitationAcceptanceTest extends PublicPredictionFixture {

    private RoleDefinition ownerRole;
    private User claimant;
    private Invitation invitation;

    /** Someone registered the invitee's address first, and the owner invited that address. */
    @BeforeEach
    void anAddressRegisteredByWhoeverCameFirstIsInvited() {
        ownerRole = authorizeOwner();
        String address = "alice-" + UUID.randomUUID() + "@corp.example";
        inTransaction(() -> {
            claimant = new User("claimant" + System.nanoTime(), address, "unused", "Not Alice", SystemRole.USER);
            entityManager.persist(claimant);
            invitation = new Invitation(organization, address, ownerRole, UUID.randomUUID().toString(), owner,
                    OffsetDateTime.now(ZoneOffset.UTC).plusDays(7));
            entityManager.persist(invitation);
        });
    }

    @Test
    void theInviteeSeesTheInvitationButNotItsLink() throws Exception {
        mockMvc.perform(signedIn(get("/api/invitations/pending"), claimant.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].organizationName").value(organization.getName()))
                .andExpect(jsonPath("$[0].token").isEmpty());
        mockMvc.perform(signedIn(get("/api/invitations/pending/catalog"), claimant.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].token").isEmpty());
    }

    @Test
    void withoutTheLinkTheAccountCannotJoin() throws Exception {
        for (String guess : new String[] { String.valueOf(invitation.getId()), UUID.randomUUID().toString() }) {
            mockMvc.perform(signedIn(post("/api/invitations/{token}/accept", guess), claimant.getId()))
                    .andExpect(status().isNotFound());
        }

        assertTrue(membership(claimant).isEmpty());
    }

    @Test
    void theInviterSharesTheLinkAndItsHolderJoins() throws Exception {
        JsonNode listed = objectMapper.readTree(mockMvc.perform(signedIn(get(
                "/api/organizations/{id}/invitations", organization.getId()), owner.getId()))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8));
        String link = listed.get(0).get("token").asText();

        mockMvc.perform(signedIn(post("/api/invitations/{token}/accept", link), claimant.getId()))
                .andExpect(status().isOk());

        assertEquals(MembershipStatus.ACTIVE, membership(claimant).orElseThrow());
    }

    @Test
    void theLinkJoinsOnlyTheAccountWithTheInvitedAddress() throws Exception {
        mockMvc.perform(signedIn(post("/api/invitations/{token}/accept", invitation.getToken()), owner.getId()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invitation email does not match current user."));
    }

    private java.util.Optional<MembershipStatus> membership(User user) {
        entityManager.clear();
        return entityManager.createQuery("select m.status from OrganizationMembership m "
                + "where m.organization.id = :organization and m.user.id = :user", MembershipStatus.class)
                .setParameter("organization", organization.getId()).setParameter("user", user.getId())
                .getResultList().stream().findFirst();
    }
}
