package dev.ulloasp.mlsuite.organization;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import dev.ulloasp.mlsuite.organization.domain.model.MembershipStatus;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationMembership;
import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.role.domain.model.RoleDefinition;
import dev.ulloasp.mlsuite.role.domain.model.RoleScope;
import dev.ulloasp.mlsuite.schema.PublicPredictionFixture;
import dev.ulloasp.mlsuite.user.domain.model.SystemRole;
import dev.ulloasp.mlsuite.user.domain.model.User;

/** Members, owner candidates and assignable roles of an organization, paged on PostgreSQL. */
class MemberCatalogTest extends PublicPredictionFixture {
    private final List<Long> roleIds = new ArrayList<>();
    private final List<Long> membershipIds = new ArrayList<>();
    private RoleDefinition ownerRole;
    private String organizationPath;

    /** The owner and fifty members, "Person 0" to "Person 49", each with a role of their own. */
    @BeforeEach
    void fiftyMembers() {
        ownerRole = authorizeOwner();
        organizationPath = "/api/organizations/" + organization.getId();
        inTransaction(() -> {
            for (int i = 0; i < 50; i++) {
                String name = "member-" + schema.getId() + "-" + i;
                User user = new User(name, name + "@test.example", "unused", "Person " + i, SystemRole.USER);
                entityManager.persist(user);
                RoleDefinition role = new RoleDefinition(organization, RoleScope.ORGANIZATION, "Custom " + i,
                        "custom-" + i, null);
                entityManager.persist(role);
                roleIds.add(role.getId());
                OrganizationMembership membership = new OrganizationMembership(organization, user, role,
                        MembershipStatus.ACTIVE);
                entityManager.persist(membership);
                membershipIds.add(membership.getId());
            }
        });
    }

    @Test
    void membersPageBeforeActionsAndPreserveAuthorization() throws Exception {
        String path = organizationPath + "/members/catalog";
        mockMvc.perform(asOwner(get(path).param("size", "24").param("page", "2")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(51))
                .andExpect(jsonPath("$.items.length()").value(3))
                .andExpect(jsonPath("$.totalMembers").value(51));
        mockMvc.perform(asOwner(get(path).param("filter", roleIds.getLast().toString())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(1))
                .andExpect(jsonPath("$.totalMembers").value(51))
                .andExpect(jsonPath("$.items[0].fullName").value("Person 49"))
                .andExpect(jsonPath("$.items[0].actions.assignableRoles.length()").value(0));
        mockMvc.perform(asOwner(get(path).param("search", "PERSON 4")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(11))
                .andExpect(jsonPath("$.totalMembers").value(51));

        grantOwner(PermissionKey.VIEW_MODELS);
        mockMvc.perform(asOwner(get(path))).andExpect(status().isForbidden());
    }

    @Test
    void roleFacetsSearchAndPageAllRolesHeldByActiveMembers() throws Exception {
        String path = organizationPath + "/members/roles/catalog";
        mockMvc.perform(asOwner(get(path).param("size", "24").param("page", "2")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(51))
                .andExpect(jsonPath("$.items.length()").value(3))
                .andExpect(jsonPath("$.hasNext").value(false));
        mockMvc.perform(asOwner(get(path).param("search", "CUSTOM 4")))
                .andExpect(jsonPath("$.totalItems").value(11));
        mockMvc.perform(asOwner(get(path).param("filter", roleIds.getLast().toString())))
                .andExpect(jsonPath("$.items[0].id").value(roleIds.getLast()))
                .andExpect(jsonPath("$.totalItems").value(1));
        inTransaction(() -> entityManager.find(OrganizationMembership.class, membershipIds.getLast())
                .setStatus(MembershipStatus.REMOVED));
        mockMvc.perform(asOwner(get(path).param("filter", roleIds.getLast().toString())))
                .andExpect(jsonPath("$.totalItems").value(0));
        grantOwner(PermissionKey.VIEW_MODELS);
        mockMvc.perform(asOwner(get(path))).andExpect(status().isForbidden());
    }

    @Test
    void assignableRolesLeaveOutTheOwnerRoleAndFollowTheRightToChangeTheMember() throws Exception {
        String path = organizationPath + "/members/" + membershipIds.getFirst() + "/roles/catalog";
        mockMvc.perform(asOwner(get(path).param("size", "24").param("page", "2")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(50))
                .andExpect(jsonPath("$.items.length()").value(2))
                .andExpect(jsonPath("$.hasNext").value(false));
        mockMvc.perform(asOwner(get(path).param("search", "custom 4")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(11))
                .andExpect(jsonPath("$.items[0].name").value("Custom 4"));
        mockMvc.perform(asOwner(get(organizationPath + "/members/0/roles/catalog")))
                .andExpect(status().isNotFound());

        // Seeing members is not enough: the caller must be allowed to change this member's role.
        grantOwner(PermissionKey.VIEW_MEMBERS);
        mockMvc.perform(asOwner(get(path))).andExpect(status().isForbidden());
    }

    @Test
    void ownerCandidatesNeedBothSeeingMembersAndTransferringOwnership() throws Exception {
        String path = organizationPath + "/owner-candidates/catalog";
        mockMvc.perform(asOwner(get(path).param("size", "24").param("page", "2")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(50))
                .andExpect(jsonPath("$.items.length()").value(2))
                .andExpect(jsonPath("$.items[0].actions.canChangeRole").value(false));
        mockMvc.perform(asOwner(get(path).param("search", "-49@TEST.example")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(1))
                .andExpect(jsonPath("$.items[0].fullName").value("Person 49"));

        grantOwner(PermissionKey.TRANSFER_OWNERSHIP);
        mockMvc.perform(asOwner(get(path))).andExpect(status().isForbidden());
        grantOwner(PermissionKey.VIEW_MEMBERS);
        mockMvc.perform(asOwner(get(path))).andExpect(status().isForbidden());
        grantOwner(PermissionKey.VIEW_MEMBERS, PermissionKey.TRANSFER_OWNERSHIP);
        mockMvc.perform(asOwner(get(path))).andExpect(status().isOk());
    }

    private void grantOwner(PermissionKey... permissions) {
        inTransaction(() -> entityManager.find(RoleDefinition.class, ownerRole.getId())
                .setPermissions(EnumSet.copyOf(Set.of(permissions))));
    }

    private MockHttpServletRequestBuilder asOwner(MockHttpServletRequestBuilder request) {
        return signedIn(request, owner.getId());
    }
}
