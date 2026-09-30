package dev.ulloasp.mlsuite.support;

import java.util.EnumSet;
import java.util.Set;

import dev.ulloasp.mlsuite.organization.domain.model.MembershipStatus;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationMembership;
import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.role.domain.model.RoleDefinition;
import dev.ulloasp.mlsuite.role.domain.model.RoleScope;
import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import dev.ulloasp.mlsuite.user.domain.model.SystemRole;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.workspace.application.dto.WorkspacePermissionsDto;

/** Shared in-memory domain objects for unit tests. */
public final class TestFixtures {

    public static final long ORG_ID = 41L;

    private TestFixtures() {
    }

    public static User user(Long id) {
        User user = new User();
        user.setId(id);
        user.setUsername("user-" + id);
        user.setEmail("user" + id + "@example.com");
        user.setFullName("User " + id);
        user.setSystemRole(SystemRole.USER);
        return user;
    }

    public static CurrentUser currentUser(Long id) {
        return new CurrentUser(id, "user-" + id, SystemRole.USER);
    }

    public static Organization organization() {
        return organization(ORG_ID);
    }

    public static Organization organization(Long id) {
        Organization organization = new Organization();
        organization.setId(id);
        organization.setName("Org");
        organization.setSlug("org");
        return organization;
    }

    /** A role definition; pass a system key such as "OWNER" for system roles, or null for custom ones. */
    public static RoleDefinition role(Organization organization, String systemKey, PermissionKey... permissions) {
        String name = systemKey == null ? "Custom" : systemKey;
        RoleDefinition role = new RoleDefinition(organization, RoleScope.ORGANIZATION, name, name.toLowerCase(), systemKey);
        role.setPermissions(permissions.length == 0 ? EnumSet.noneOf(PermissionKey.class) : EnumSet.of(permissions[0], permissions));
        return role;
    }

    public static OrganizationMembership membership(Organization organization, User user, RoleDefinition role) {
        return new OrganizationMembership(organization, user, role, MembershipStatus.ACTIVE);
    }

    public static WorkspacePermissionsDto permissions(PermissionKey... granted) {
        return WorkspacePermissionsDto.from(granted.length == 0 ? Set.of() : EnumSet.of(granted[0], granted));
    }

    public static WorkspacePermissionsDto allPermissions() {
        return WorkspacePermissionsDto.from(EnumSet.allOf(PermissionKey.class));
    }
}
