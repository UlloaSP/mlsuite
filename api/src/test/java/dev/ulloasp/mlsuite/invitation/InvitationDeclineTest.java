package dev.ulloasp.mlsuite.invitation;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import dev.ulloasp.mlsuite.invitation.domain.model.Invitation;
import dev.ulloasp.mlsuite.invitation.domain.model.InvitationStatus;
import dev.ulloasp.mlsuite.role.domain.model.RoleDefinition;
import dev.ulloasp.mlsuite.schema.PublicPredictionFixture;

/** Declining an invitation: only its invitee may, and only while it is pending and unexpired. */
class InvitationDeclineTest extends PublicPredictionFixture {

    private final OffsetDateTime nextWeek = OffsetDateTime.now(ZoneOffset.UTC).plusDays(7);
    private RoleDefinition ownerRole;

    @BeforeEach
    void makeTheOwnerAMember() {
        ownerRole = authorizeOwner();
    }

    @Test
    void theInviteeDeclinesAPendingInvitation() throws Exception {
        Invitation invitation = stored(owner.getEmail(), InvitationStatus.PENDING, nextWeek);

        mockMvc.perform(decline(invitation)).andExpect(status().isNoContent());

        assertEquals(InvitationStatus.REVOKED, statusOf(invitation));
    }

    @Test
    void anAcceptedInvitationCannotBeDeclined() throws Exception {
        Invitation invitation = stored(owner.getEmail(), InvitationStatus.ACCEPTED, nextWeek);

        mockMvc.perform(decline(invitation))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invitation is not pending."));

        assertEquals(InvitationStatus.ACCEPTED, statusOf(invitation));
    }

    @Test
    void anotherUsersInvitationCannotBeDeclined() throws Exception {
        Invitation invitation = stored("someone-else-" + UUID.randomUUID() + "@test.example",
                InvitationStatus.PENDING, nextWeek);

        mockMvc.perform(decline(invitation))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invitation email does not match current user."));

        assertEquals(InvitationStatus.PENDING, statusOf(invitation));
    }

    @Test
    void anExpiredInvitationCannotBeDeclined() throws Exception {
        Invitation invitation = stored(owner.getEmail(), InvitationStatus.PENDING, nextWeek.minusDays(8));

        mockMvc.perform(decline(invitation))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invitation expired."));

        assertEquals(InvitationStatus.PENDING, statusOf(invitation));
    }

    @Test
    void anUnknownTokenIsNotFound() throws Exception {
        mockMvc.perform(signedIn(post("/api/invitations/{token}/decline", UUID.randomUUID()), owner.getId()))
                .andExpect(status().isNotFound());
    }

    @Test
    void declineRequiresASession() throws Exception {
        Invitation invitation = stored(owner.getEmail(), InvitationStatus.PENDING, nextWeek);

        mockMvc.perform(post("/api/invitations/{token}/decline", invitation.getToken()))
                .andExpect(status().isUnauthorized());

        assertEquals(InvitationStatus.PENDING, statusOf(invitation));
    }

    private Invitation stored(String email, InvitationStatus invitationStatus, OffsetDateTime expiresAt) {
        Invitation invitation = new Invitation(organization, email, ownerRole, UUID.randomUUID().toString(), owner,
                expiresAt);
        invitation.setStatus(invitationStatus);
        inTransaction(() -> entityManager.persist(invitation));
        return invitation;
    }

    private InvitationStatus statusOf(Invitation invitation) {
        entityManager.clear();
        return entityManager.find(Invitation.class, invitation.getId()).getStatus();
    }

    private MockHttpServletRequestBuilder decline(Invitation invitation) {
        return signedIn(post("/api/invitations/{token}/decline", invitation.getToken()), owner.getId());
    }
}
