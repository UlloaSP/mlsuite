package dev.ulloasp.mlsuite.invitation;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import dev.ulloasp.mlsuite.invitation.domain.model.Invitation;
import dev.ulloasp.mlsuite.invitation.domain.model.InvitationStatus;
import dev.ulloasp.mlsuite.organization.domain.model.MembershipStatus;
import dev.ulloasp.mlsuite.role.domain.model.RoleDefinition;
import dev.ulloasp.mlsuite.schema.PublicPredictionFixture;
import dev.ulloasp.mlsuite.user.domain.model.SystemRole;
import dev.ulloasp.mlsuite.user.domain.model.User;

/**
 * An invitee answers an invitation from Notifications: signed in with the invited address, while
 * it is pending and unexpired. Anyone else's invitation does not exist for them.
 */
class InvitationAnswerTest extends PublicPredictionFixture {

    private final OffsetDateTime nextWeek = OffsetDateTime.now(ZoneOffset.UTC).plusDays(7);
    @Autowired JdbcTemplate jdbc;
    private RoleDefinition ownerRole;
    private User invitee;

    @BeforeEach
    void anInviteeWithAnAccount() {
        ownerRole = authorizeOwner();
        String address = "invitee-" + UUID.randomUUID() + "@corp.example";
        inTransaction(() -> {
            invitee = new User("invitee" + System.nanoTime(), address, "unused", "Invitee", SystemRole.USER);
            entityManager.persist(invitee);
        });
    }

    @Test
    void theInviteeSeesThePendingInvitationWithoutAnySecret() throws Exception {
        Invitation invitation = stored(invitee.getEmail(), InvitationStatus.PENDING, nextWeek);

        mockMvc.perform(signedIn(get("/api/invitations/pending"), invitee.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(invitation.getId()))
                .andExpect(jsonPath("$[0].organizationName").value(organization.getName()))
                .andExpect(jsonPath("$[0].token").doesNotExist());
        mockMvc.perform(signedIn(get("/api/invitations/pending/catalog"), invitee.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].id").value(invitation.getId()))
                .andExpect(jsonPath("$.items[0].token").doesNotExist());
    }

    @Test
    void theInviteeAcceptsAndJoinsTheOrganization() throws Exception {
        Invitation invitation = stored(invitee.getEmail(), InvitationStatus.PENDING, nextWeek);

        mockMvc.perform(answer(invitation, "accept", invitee))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACCEPTED"));

        assertEquals(InvitationStatus.ACCEPTED, statusOf(invitation));
        assertEquals(MembershipStatus.ACTIVE, membership(invitee).orElseThrow());
        assertEquals(organization.getId(),
                entityManager.find(User.class, invitee.getId()).getCurrentOrganization().getId());
    }

    @Test
    void theInviteeDeclines() throws Exception {
        Invitation invitation = stored(invitee.getEmail(), InvitationStatus.PENDING, nextWeek);

        mockMvc.perform(answer(invitation, "decline", invitee)).andExpect(status().isNoContent());

        assertEquals(InvitationStatus.REVOKED, statusOf(invitation));
        assertTrue(membership(invitee).isEmpty());
    }

    @Test
    void whoInvitedIsToldTheAnswerAndTheInviteeStopsCountingItAsUnread() throws Exception {
        Invitation accepted = stored(invitee.getEmail(), InvitationStatus.PENDING, nextWeek);
        Invitation declined = stored(invitee.getEmail(), InvitationStatus.PENDING, nextWeek);
        for (Invitation invitation : new Invitation[] { accepted, declined }) {
            jdbc.update("""
                    INSERT INTO notification (recipient_user_id, organization_id, kind, target_type, target_id, payload, created_at)
                    VALUES (?, ?, 'INVITATION_RECEIVED', 'INVITATION', ?, '{}', now())""", invitee.getId(),
                    organization.getId(), invitation.getId().toString());
        }

        mockMvc.perform(answer(accepted, "accept", invitee)).andExpect(status().isOk());
        mockMvc.perform(answer(declined, "decline", invitee)).andExpect(status().isNoContent());

        assertEquals("INVITATION_ACCEPTED", toldTheInviter(accepted));
        assertEquals("INVITATION_DECLINED", toldTheInviter(declined));
        assertEquals(invitee.getFullName(), jdbc.queryForObject("SELECT payload ->> 'inviteeName' FROM notification"
                + " WHERE recipient_user_id = ? AND target_id = ?", String.class, owner.getId(), accepted.getId().toString()));
        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM notification WHERE recipient_user_id = ?"
                + " AND read_at IS NULL", Integer.class, invitee.getId()));
    }

    @Test
    void anAnswerThatFailsTellsNobody() throws Exception {
        Invitation expired = stored(invitee.getEmail(), InvitationStatus.PENDING, nextWeek.minusDays(8));

        mockMvc.perform(answer(expired, "accept", invitee)).andExpect(status().isBadRequest());

        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM notification WHERE target_type = 'INVITATION'"
                + " AND target_id = ?", Integer.class, expired.getId().toString()));
    }

    @Test
    void anotherAccountCannotAnswerTheInvitation() throws Exception {
        Invitation invitation = stored(invitee.getEmail(), InvitationStatus.PENDING, nextWeek);

        for (String verb : new String[] { "accept", "decline" }) {
            mockMvc.perform(answer(invitation, verb, owner))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.message").value("Invitation '" + invitation.getId() + "' does not exist."));
        }

        assertEquals(InvitationStatus.PENDING, statusOf(invitation));
        assertTrue(membership(invitee).isEmpty());
    }

    @Test
    void anAnsweredInvitationCannotBeAnsweredAgain() throws Exception {
        for (InvitationStatus answered : new InvitationStatus[] { InvitationStatus.ACCEPTED, InvitationStatus.REVOKED }) {
            Invitation invitation = stored(invitee.getEmail(), answered, nextWeek);
            for (String verb : new String[] { "accept", "decline" }) {
                mockMvc.perform(answer(invitation, verb, invitee))
                        .andExpect(status().isBadRequest())
                        .andExpect(jsonPath("$.message").value("Invitation is not pending."));
            }
            assertEquals(answered, statusOf(invitation));
        }
        assertTrue(membership(invitee).isEmpty());
    }

    @Test
    void anExpiredInvitationCannotBeAnswered() throws Exception {
        for (String verb : new String[] { "accept", "decline" }) {
            Invitation invitation = stored(invitee.getEmail(), InvitationStatus.PENDING, nextWeek.minusDays(8));

            mockMvc.perform(answer(invitation, verb, invitee))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message").value("Invitation expired."));

            assertEquals(InvitationStatus.PENDING, statusOf(invitation));
        }
        assertTrue(membership(invitee).isEmpty());
    }

    @Test
    void anUnknownInvitationIsNotFound() throws Exception {
        mockMvc.perform(signedIn(post("/api/invitations/{id}/accept", Long.MAX_VALUE), invitee.getId()))
                .andExpect(status().isNotFound());
    }

    @Test
    void answeringRequiresASession() throws Exception {
        Invitation invitation = stored(invitee.getEmail(), InvitationStatus.PENDING, nextWeek);

        mockMvc.perform(post("/api/invitations/{id}/accept", invitation.getId()))
                .andExpect(status().isUnauthorized());

        assertEquals(InvitationStatus.PENDING, statusOf(invitation));
    }

    private Invitation stored(String email, InvitationStatus invitationStatus, OffsetDateTime expiresAt) {
        Invitation invitation = new Invitation(organization, email, ownerRole, owner, expiresAt);
        invitation.setStatus(invitationStatus);
        inTransaction(() -> entityManager.persist(invitation));
        return invitation;
    }

    private MockHttpServletRequestBuilder answer(Invitation invitation, String verb, User user) {
        return signedIn(post("/api/invitations/{id}/" + verb, invitation.getId()), user.getId());
    }

    private String toldTheInviter(Invitation invitation) {
        return jdbc.queryForObject("SELECT kind FROM notification WHERE recipient_user_id = ? AND target_type = 'INVITATION'"
                + " AND target_id = ?", String.class, owner.getId(), invitation.getId().toString());
    }

    private InvitationStatus statusOf(Invitation invitation) {
        entityManager.clear();
        return entityManager.find(Invitation.class, invitation.getId()).getStatus();
    }

    private Optional<MembershipStatus> membership(User user) {
        entityManager.clear();
        return entityManager.createQuery("select m.status from OrganizationMembership m "
                + "where m.organization.id = :organization and m.user.id = :user", MembershipStatus.class)
                .setParameter("organization", organization.getId()).setParameter("user", user.getId())
                .getResultList().stream().findFirst();
    }
}
