package dev.ulloasp.mlsuite.invitation;

import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.EnumSet;
import java.util.Locale;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import dev.ulloasp.mlsuite.invitation.domain.model.Invitation;
import dev.ulloasp.mlsuite.invitation.domain.model.InvitationStatus;
import dev.ulloasp.mlsuite.organization.domain.model.MembershipStatus;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationMembership;
import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.role.domain.model.RoleDefinition;
import dev.ulloasp.mlsuite.schema.PublicPredictionFixture;
import dev.ulloasp.mlsuite.user.domain.model.SystemRole;
import dev.ulloasp.mlsuite.user.domain.model.User;

/** Invitations, invitation candidates and a user's pending invitations, paged on PostgreSQL. */
class InvitationCatalogTest extends PublicPredictionFixture {
    private final OffsetDateTime nextWeek = OffsetDateTime.now(ZoneOffset.UTC).plusDays(7);
    private RoleDefinition ownerRole;
    private String organizationPath;
    /** Unique to the test: every test on the fixture shares one database of users. */
    private String mark;

    @BeforeEach
    void makeTheOwnerAMember() {
        ownerRole = authorizeOwner();
        organizationPath = "/api/organizations/" + organization.getId();
        mark = String.valueOf(schema.getId());
    }

    @Test
    void invitationsFilterByStatusSearchByEmailAndPageWithTheUnfilteredTotal() throws Exception {
        inTransaction(() -> {
            for (int i = 0; i < 30; i++) {
                Invitation invitation = invitation(organization, "guest-%s-%02d@test.example".formatted(mark, i));
                invitation.setStatus(i % 10 == 0 ? InvitationStatus.REVOKED
                        : i == 5 ? InvitationStatus.ACCEPTED : InvitationStatus.PENDING);
                entityManager.persist(invitation);
            }
            // Equal creation times leave the order to the id, so pages neither repeat nor skip a row.
            entityManager.createQuery("update Invitation i set i.createdAt = :at where i.organization.id = :id")
                    .setParameter("at", nextWeek.minusDays(8))
                    .setParameter("id", organization.getId())
                    .executeUpdate();
        });
        String path = organizationPath + "/invitations/catalog";

        mockMvc.perform(asOwner(get(path).param("size", "24")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(30))
                .andExpect(jsonPath("$.totalInvitations").value(30))
                .andExpect(jsonPath("$.items.length()").value(24))
                .andExpect(jsonPath("$.hasNext").value(true))
                .andExpect(jsonPath("$.items[0].email").value("guest-%s-00@test.example".formatted(mark)))
                .andExpect(jsonPath("$.items[0].token").isString());
        mockMvc.perform(asOwner(get(path).param("size", "24").param("page", "1")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(6))
                .andExpect(jsonPath("$.hasNext").value(false))
                .andExpect(jsonPath("$.items[0].email").value("guest-%s-24@test.example".formatted(mark)));
        mockMvc.perform(asOwner(get(path).param("filter", "revoked")))
                .andExpect(jsonPath("$.totalItems").value(3))
                .andExpect(jsonPath("$.totalInvitations").value(30));
        mockMvc.perform(asOwner(get(path).param("filter", "PENDING")))
                .andExpect(jsonPath("$.totalItems").value(26));
        mockMvc.perform(asOwner(get(path).param("filter", "not-a-status")))
                .andExpect(jsonPath("$.totalItems").value(0))
                .andExpect(jsonPath("$.totalInvitations").value(30));
        mockMvc.perform(asOwner(get(path).param("search", "GUEST-" + mark + "-1")))
                .andExpect(jsonPath("$.totalItems").value(10))
                .andExpect(jsonPath("$.totalInvitations").value(30));
        mockMvc.perform(asOwner(get(path).param("search", "guest-" + mark + "-1").param("filter", "revoked")))
                .andExpect(jsonPath("$.totalItems").value(1))
                .andExpect(jsonPath("$.items[0].email").value("guest-%s-10@test.example".formatted(mark)));
        mockMvc.perform(asOwner(get(path).param("search", "%")))
                .andExpect(jsonPath("$.totalItems").value(0));

        // Reading invitations does not show the tokens that accept them; managing them does.
        grantOwner(PermissionKey.VIEW_INVITATIONS);
        mockMvc.perform(asOwner(get(path)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].token").value(nullValue()));
        grantOwner(PermissionKey.INVITE_MEMBERS);
        mockMvc.perform(asOwner(get(path))).andExpect(status().isForbidden());
    }

    @Test
    void candidatesAreEnabledUsersOutsideTheOrganizationSearchedByNameOrEmail() throws Exception {
        inTransaction(() -> {
            for (int i = 0; i < 30; i++) {
                String name = "cand-%s-%02d".formatted(mark, i);
                User user = new User(name, name + "@test.example", "unused", "Candidate %s %02d".formatted(mark, i),
                        SystemRole.USER);
                user.setEnabled(i != 3);
                entityManager.persist(user);
                if (i < 3) {
                    // An active member is no candidate; a removed one may be invited again.
                    entityManager.persist(new OrganizationMembership(organization, user, ownerRole,
                            i == 2 ? MembershipStatus.REMOVED : MembershipStatus.ACTIVE));
                }
            }
        });
        String path = organizationPath + "/invitation-candidates/catalog";

        mockMvc.perform(asOwner(get(path).param("search", "CAND-" + mark + "-").param("size", "24")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(27))
                .andExpect(jsonPath("$.items.length()").value(24))
                .andExpect(jsonPath("$.hasNext").value(true))
                .andExpect(jsonPath("$.items[0].email").value("cand-%s-02@test.example".formatted(mark)))
                .andExpect(jsonPath("$.items[1].email").value("cand-%s-04@test.example".formatted(mark)));
        mockMvc.perform(asOwner(get(path).param("search", "cand-" + mark + "-").param("size", "24").param("page", "1")))
                .andExpect(jsonPath("$.items.length()").value(3))
                .andExpect(jsonPath("$.hasNext").value(false));
        mockMvc.perform(asOwner(get(path).param("search", "candidate " + mark + " 2")))
                .andExpect(jsonPath("$.totalItems").value(10));
        mockMvc.perform(asOwner(get(path).param("search", "cand_" + mark)))
                .andExpect(jsonPath("$.totalItems").value(0));

        grantOwner(PermissionKey.VIEW_INVITATIONS);
        mockMvc.perform(asOwner(get(path))).andExpect(status().isForbidden());
    }

    @Test
    void pendingInvitationsAreTheCallersOwnOpenOnes() throws Exception {
        inTransaction(() -> {
            Organization north = new Organization("north-" + mark, "North " + mark, null, owner);
            Organization south = new Organization("south-" + mark, "South " + mark, null, owner);
            entityManager.persist(north);
            entityManager.persist(south);
            entityManager.persist(invitation(north, owner.getEmail()));
            entityManager.persist(invitation(south, owner.getEmail()));
            Invitation expired = invitation(south, owner.getEmail());
            expired.setExpiresAt(nextWeek.minusDays(8));
            entityManager.persist(expired);
            Invitation revoked = invitation(north, owner.getEmail());
            revoked.setStatus(InvitationStatus.REVOKED);
            entityManager.persist(revoked);
            entityManager.persist(invitation(north, "someone-else-" + mark + "@test.example"));
        });
        String path = "/api/invitations/pending/catalog";

        mockMvc.perform(asOwner(get(path)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(2))
                .andExpect(jsonPath("$.items[0].token").isString());
        mockMvc.perform(asOwner(get(path).param("size", "1").param("page", "1")))
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.hasNext").value(false));
        mockMvc.perform(asOwner(get(path).param("search", "north " + mark)))
                .andExpect(jsonPath("$.totalItems").value(1))
                .andExpect(jsonPath("$.items[0].organizationName").value("North " + mark));
        mockMvc.perform(get(path)).andExpect(status().isUnauthorized());
    }

    @Test
    void pendingCatalogPagesMoreThanOneScreenAndEscapesSearchWildcards() throws Exception {
        inTransaction(() -> {
            for (int i = 0; i < 30; i++) entityManager.persist(invitation(organization, owner.getEmail()));
        });
        String path = "/api/invitations/pending/catalog";
        mockMvc.perform(asOwner(get(path).param("page", "1").param("size", "24")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalItems").value(30))
                .andExpect(jsonPath("$.items.length()").value(6)).andExpect(jsonPath("$.hasNext").value(false));
        mockMvc.perform(asOwner(get(path).param("search", owner.getEmail().toUpperCase(Locale.ROOT))))
                .andExpect(jsonPath("$.totalItems").value(30));
        mockMvc.perform(asOwner(get(path).param("search", "%")))
                .andExpect(jsonPath("$.totalItems").value(0));
    }

    private Invitation invitation(Organization target, String email) {
        return new Invitation(target, email, ownerRole, UUID.randomUUID().toString(), owner, nextWeek);
    }

    private void grantOwner(PermissionKey permission) {
        inTransaction(() -> entityManager.find(RoleDefinition.class, ownerRole.getId())
                .setPermissions(EnumSet.of(permission)));
    }

    private MockHttpServletRequestBuilder asOwner(MockHttpServletRequestBuilder request) {
        return signedIn(request, owner.getId());
    }
}
