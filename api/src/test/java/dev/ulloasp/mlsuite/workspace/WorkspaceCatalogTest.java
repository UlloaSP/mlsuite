package dev.ulloasp.mlsuite.workspace;

import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.EnumSet;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import dev.ulloasp.mlsuite.organization.domain.model.MembershipStatus;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationMembership;
import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.role.domain.model.RoleDefinition;
import dev.ulloasp.mlsuite.role.domain.model.RoleScope;
import dev.ulloasp.mlsuite.schema.PublicPredictionFixture;
import dev.ulloasp.mlsuite.user.domain.model.SystemRole;
import dev.ulloasp.mlsuite.user.domain.model.User;

/** The current workspace context and the organizations a user may switch to, on PostgreSQL. */
class WorkspaceCatalogTest extends PublicPredictionFixture {
    private static final String CURRENT = "/api/workspace/context/current";
    private static final String ORGANIZATIONS = "/api/workspace/context/organizations/catalog";

    /** Unique to the test, with the characters a LIKE pattern would read as wildcards. */
    private String mark;
    private Organization north;
    private Organization south;
    private Organization left;

    /** The owner is an active member of their organization and of North, left Left, and never joined South. */
    @BeforeEach
    void threeMoreOrganizations() {
        authorizeOwner();
        mark = "%_" + schema.getId();
        inTransaction(() -> {
            north = organization("North", MembershipStatus.ACTIVE);
            left = organization("Left", MembershipStatus.REMOVED);
            south = organization("South", null);
        });
    }

    @Test
    void currentContextCountsActiveMembershipsAndFollowsTheSelectedOrganization() throws Exception {
        mockMvc.perform(asOwner(get(CURRENT)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.id").value(owner.getId()))
                .andExpect(jsonPath("$.currentOrganization.id").value(organization.getId()))
                .andExpect(jsonPath("$.currentMembership.roleDefinition.systemKey").value("OWNER"))
                .andExpect(jsonPath("$.permissions.canTransferOwnership").value(true))
                .andExpect(jsonPath("$.membershipCount").value(2));

        mockMvc.perform(asOwner(select(north)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentOrganization.id").value(north.getId()))
                .andExpect(jsonPath("$.currentMembership.roleDefinition.name").value("Member"))
                .andExpect(jsonPath("$.permissions.canTransferOwnership").value(false))
                .andExpect(jsonPath("$.membershipCount").value(2));
        mockMvc.perform(asOwner(get(CURRENT)))
                .andExpect(jsonPath("$.currentOrganization.id").value(north.getId()));

        // Neither an organization they left nor one they never joined can be selected.
        mockMvc.perform(asOwner(select(left))).andExpect(status().isForbidden());
        mockMvc.perform(asOwner(select(south))).andExpect(status().isForbidden());
        mockMvc.perform(asOwner(get(CURRENT)))
                .andExpect(jsonPath("$.currentOrganization.id").value(north.getId()));
        mockMvc.perform(get(CURRENT)).andExpect(status().isUnauthorized());
    }

    @Test
    void aSuperadminActsAsOwnerOfAnyOrganizationWithoutAStoredMembership() throws Exception {
        inTransaction(() -> entityManager.find(User.class, owner.getId()).setSystemRole(SystemRole.SUPERADMIN));

        mockMvc.perform(asOwner(select(south)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentOrganization.id").value(south.getId()))
                .andExpect(jsonPath("$.currentMembership.id").value(nullValue()))
                .andExpect(jsonPath("$.currentMembership.roleDefinition.systemKey").value("OWNER"))
                .andExpect(jsonPath("$.permissions.canDeleteOrganization").value(true))
                .andExpect(jsonPath("$.membershipCount").value(1));
        mockMvc.perform(asOwner(get(ORGANIZATIONS).param("search", mark)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(3));
    }

    @Test
    void organizationsAreTheActiveMembershipsSearchedLiterallyByNameOrSlug() throws Exception {
        mockMvc.perform(asOwner(get(ORGANIZATIONS).param("search", mark.toUpperCase())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(1))
                .andExpect(jsonPath("$.items[0].id").value(north.getId()));
        mockMvc.perform(asOwner(get(ORGANIZATIONS).param("search", "north-" + schema.getId())))
                .andExpect(jsonPath("$.totalItems").value(1));
        mockMvc.perform(asOwner(get(ORGANIZATIONS).param("size", "1")))
                .andExpect(jsonPath("$.totalItems").value(2))
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.items[0].id").value(organization.getId()))
                .andExpect(jsonPath("$.hasNext").value(true));
        // As wildcards "%_" would match both of their organizations; as text it matches none without it.
        mockMvc.perform(asOwner(get(ORGANIZATIONS).param("search", "x%_")))
                .andExpect(jsonPath("$.totalItems").value(0));
    }

    /** An organization named after the test, which the owner joined with that status, or not at all. */
    private Organization organization(String name, MembershipStatus membership) {
        Organization created = new Organization(name.toLowerCase() + "-" + schema.getId(), name + " " + mark, null,
                owner);
        entityManager.persist(created);
        if (membership != null) {
            // This custom role must not occupy a system slug when another context seeds this database.
            RoleDefinition role = new RoleDefinition(created, RoleScope.ORGANIZATION, "Member", "workspace-member", null);
            role.setPermissions(EnumSet.of(PermissionKey.VIEW_WORKSPACE));
            entityManager.persist(role);
            entityManager.persist(new OrganizationMembership(created, owner, role, membership));
        }
        return created;
    }

    private MockHttpServletRequestBuilder select(Organization target) {
        return patch(CURRENT).contentType(MediaType.APPLICATION_JSON)
                .content("{\"organizationId\":" + target.getId() + "}");
    }

    private MockHttpServletRequestBuilder asOwner(MockHttpServletRequestBuilder request) {
        return signedIn(request, owner.getId());
    }
}
