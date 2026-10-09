package dev.ulloasp.mlsuite.role;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.EnumSet;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import dev.ulloasp.mlsuite.organization.domain.model.MembershipStatus;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationMembership;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationRole;
import dev.ulloasp.mlsuite.role.application.service.RoleSeedService;
import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.role.domain.model.RoleDefinition;
import dev.ulloasp.mlsuite.role.domain.model.RoleScope;
import dev.ulloasp.mlsuite.schema.PublicPredictionFixture;
import dev.ulloasp.mlsuite.user.domain.model.SystemRole;
import dev.ulloasp.mlsuite.user.domain.model.User;

/** An organization's roles, role templates and permissions, paged over PostgreSQL. */
class RoleListCatalogTest extends PublicPredictionFixture {
    /** Four system roles, thirty analyst roles, the inviter's and the outsider's. */
    private static final int ROLES = 36;

    @Autowired RoleSeedService roleSeedService;
    private String organizationPath;
    private User inviter;
    private User outsider;

    /**
     * The owner holds the seeded owner role; "Analyst 00" to "Analyst 29" are custom roles, the
     * first held by three members; the inviter may invite members and nothing else, and the
     * outsider may only see models.
     */
    @BeforeEach
    void seedRolesAndMembers() {
        organizationPath = "/api/organizations/" + organization.getId();
        inTransaction(() -> {
            roleSeedService.ensureOrganizationRoles(organization);
            join(entityManager.find(User.class, owner.getId()),
                    roleSeedService.orgRole(organization, OrganizationRole.OWNER));
            for (int i = 0; i < 30; i++) {
                RoleDefinition analyst = role("Analyst %02d".formatted(i), PermissionKey.VIEW_MODELS);
                analyst.setDescription(i == 7 ? "Reads the quarterly reports" : null);
                for (int member = 0; i == 0 && member < 3; member++) {
                    join(user("analyst-" + member), analyst);
                }
            }
            inviter = user("inviter");
            join(inviter, role("Inviter", PermissionKey.INVITE_MEMBERS));
            outsider = user("outsider");
            join(outsider, role("Outsider", PermissionKey.VIEW_MODELS));
        });
    }

    @Test
    void roleCatalogCanSeedAMissingSystemRoleAndPersistIt() throws Exception {
        inTransaction(() -> entityManager.createQuery(
                "SELECT r FROM RoleDefinition r WHERE r.organization.id = :org AND r.systemKey = 'MEMBER'",
                RoleDefinition.class).setParameter("org", organization.getId()).getResultList()
                .forEach(entityManager::remove));
        for (int read = 0; read < 2; read++) {
            mockMvc.perform(asOwner(get(organizationPath + "/roles/catalog").param("search", "member")))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.totalItems").value(1))
                    .andExpect(jsonPath("$.items[0].systemKey").value("MEMBER"));
        }
    }

    @Test
    void rolesArePagedLockedFirstWithTheirMemberCounts() throws Exception {
        String path = organizationPath + "/roles/catalog";
        mockMvc.perform(asOwner(get(path).param("size", "24")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(ROLES))
                .andExpect(jsonPath("$.items.length()").value(24))
                .andExpect(jsonPath("$.hasNext").value(true))
                .andExpect(jsonPath("$.items[0].name").value("Admin"))
                .andExpect(jsonPath("$.items[0].actions.canEdit").value(false))
                .andExpect(jsonPath("$.items[2].systemKey").value("OWNER"))
                .andExpect(jsonPath("$.items[2].userCount").value(1))
                .andExpect(jsonPath("$.items[4].name").value("Analyst 00"))
                .andExpect(jsonPath("$.items[4].userCount").value(3))
                .andExpect(jsonPath("$.items[4].actions.canEdit").value(true))
                .andExpect(jsonPath("$.items[5].userCount").value(0));
        mockMvc.perform(asOwner(get(path).param("size", "24").param("page", "1")))
                .andExpect(jsonPath("$.items.length()").value(12))
                .andExpect(jsonPath("$.hasNext").value(false));
        mockMvc.perform(asOwner(get(path).param("search", "ANALYST 2")))
                .andExpect(jsonPath("$.totalItems").value(10));
        mockMvc.perform(asOwner(get(path).param("search", "quarterly REPORTS")))
                .andExpect(jsonPath("$.totalItems").value(1))
                .andExpect(jsonPath("$.items[0].name").value("Analyst 07"));
        mockMvc.perform(asOwner(get(organizationPath + "/roles/metadata")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.roles").value(ROLES))
                .andExpect(jsonPath("$.templates").value(5))
                .andExpect(jsonPath("$.permissionCatalog.length()").value(7));
    }

    @Test
    void invitableOffersTheOwnerRoleOnlyToACallerWhoMayTransferOwnership() throws Exception {
        String path = organizationPath + "/roles/catalog";
        mockMvc.perform(asOwner(get(path).param("filter", "invitable").param("search", "owner")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(1))
                .andExpect(jsonPath("$.items[0].systemKey").value("OWNER"));
        mockMvc.perform(asOwner(get(path).param("filter", "invitable")))
                .andExpect(jsonPath("$.totalItems").value(ROLES));

        mockMvc.perform(signedIn(get(path).param("filter", "invitable").param("search", "owner"), inviter.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(0));
        mockMvc.perform(signedIn(get(path).param("filter", "invitable"), inviter.getId()))
                .andExpect(jsonPath("$.totalItems").value(ROLES - 1))
                .andExpect(jsonPath("$.items[0].actions.canEdit").value(false));
        // Outside an invitation the owner role is still listed for them.
        mockMvc.perform(signedIn(get(path), inviter.getId()))
                .andExpect(jsonPath("$.totalItems").value(ROLES));
    }

    @Test
    void templatesAndPermissionsAreSearchedAndPaged() throws Exception {
        String templates = organizationPath + "/role-templates/catalog";
        mockMvc.perform(asOwner(get(templates)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(5))
                .andExpect(jsonPath("$.items[0].name").value("Data Scientist"));
        mockMvc.perform(asOwner(get(templates).param("size", "2").param("page", "2")))
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.hasNext").value(false));
        mockMvc.perform(asOwner(get(templates).param("search", "REVIEW")))
                .andExpect(jsonPath("$.totalItems").value(1))
                .andExpect(jsonPath("$.items[0].name").value("Reviewer"));

        String permissions = organizationPath + "/permissions/catalog";
        mockMvc.perform(asOwner(get(permissions)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(7))
                .andExpect(jsonPath("$.items[0].name").value("Organization"));
        mockMvc.perform(asOwner(get(permissions).param("search", "transfer")))
                .andExpect(jsonPath("$.totalItems").value(1))
                .andExpect(jsonPath("$.items[0].permissions.length()").value(1))
                .andExpect(jsonPath("$.items[0].permissions[0].key").value("TRANSFER_OWNERSHIP"));
        mockMvc.perform(asOwner(get(permissions).param("search", "invitations")))
                .andExpect(jsonPath("$.totalItems").value(1))
                .andExpect(jsonPath("$.items[0].permissions.length()").value(2));
    }

    @Test
    void aMemberWhoMayNeitherSeeInviteNorManageMembersReadsNone() throws Exception {
        for (String resource : new String[] { "roles/catalog", "roles/metadata", "role-templates/catalog",
                "permissions/catalog" }) {
            mockMvc.perform(signedIn(get(organizationPath + "/" + resource), outsider.getId()))
                    .andExpect(status().isForbidden());
        }
    }

    private RoleDefinition role(String name, PermissionKey permission) {
        RoleDefinition role = new RoleDefinition(organization, RoleScope.ORGANIZATION, name,
                name.toLowerCase().replace(' ', '-'), null);
        role.setPermissions(EnumSet.of(permission));
        entityManager.persist(role);
        return role;
    }

    private User user(String name) {
        String unique = name + "-" + schema.getId();
        User user = new User(unique, unique + "@test.example", "unused", name, SystemRole.USER);
        entityManager.persist(user);
        return user;
    }

    private void join(User user, RoleDefinition role) {
        entityManager.persist(new OrganizationMembership(organization, user, role, MembershipStatus.ACTIVE));
        user.setCurrentOrganization(organization);
    }

    private MockHttpServletRequestBuilder asOwner(MockHttpServletRequestBuilder request) {
        return signedIn(request, owner.getId());
    }
}
