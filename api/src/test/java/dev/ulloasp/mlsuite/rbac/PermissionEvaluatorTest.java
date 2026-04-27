package dev.ulloasp.mlsuite.rbac;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Set;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import dev.ulloasp.mlsuite.organization.entities.Organization;
import dev.ulloasp.mlsuite.rbac.entities.Permission;
import dev.ulloasp.mlsuite.rbac.entities.PermissionGroup;
import dev.ulloasp.mlsuite.rbac.entities.Role;
import dev.ulloasp.mlsuite.rbac.entities.RolePermission;
import dev.ulloasp.mlsuite.rbac.entities.UserRole;
import dev.ulloasp.mlsuite.rbac.repositories.RolePermissionRepository;
import dev.ulloasp.mlsuite.rbac.repositories.UserRoleRepository;
import dev.ulloasp.mlsuite.rbac.services.PermissionEvaluator;
import dev.ulloasp.mlsuite.security.tenant.PermissionDeniedException;

@ExtendWith(MockitoExtension.class)
class PermissionEvaluatorTest {

    @Mock
    private UserRoleRepository userRoleRepository;

    @Mock
    private RolePermissionRepository rolePermissionRepository;

    private PermissionEvaluator service;

    @BeforeEach
    void setUp() {
        service = new PermissionEvaluator(userRoleRepository, rolePermissionRepository);
    }

    @Test
    void resolvePermissions_ReturnsAllForSuperadmin() {
        Set<String> permissions = service.resolvePermissions(9L, 4L, true);

        assertEquals(Set.copyOf(RbacPermissions.ALL), permissions);
    }

    @Test
    void resolvePermissions_AggregatesDistinctRolePermissions() {
        Role adminRole = role(21L, "admin", 9L);
        Role memberRole = role(22L, "member", 9L);
        when(userRoleRepository.findByOrganizationIdAndUserId(9L, 4L))
                .thenReturn(List.of(userRole(adminRole), userRole(memberRole)));
        when(rolePermissionRepository.findByRoleId(21L))
                .thenReturn(List.of(rolePermission(adminRole, "plugins", "manage")));
        when(rolePermissionRepository.findByRoleId(22L))
                .thenReturn(List.of(rolePermission(memberRole, "plugins", "manage"), rolePermission(memberRole, "models", "read")));

        Set<String> permissions = service.resolvePermissions(9L, 4L, false);

        assertEquals(Set.of("plugins:manage", "models:read"), permissions);
    }

    @Test
    void requirePermission_ThrowsWhenPermissionMissing() {
        assertThrows(PermissionDeniedException.class,
                () -> service.requirePermission(Set.of("models:read"), "plugins:manage"));
    }

    private Role role(Long id, String name, Long organizationId) {
        Organization organization = new Organization();
        organization.setId(organizationId);
        Role role = new Role();
        role.setId(id);
        role.setName(name);
        role.setOrganization(organization);
        return role;
    }

    private UserRole userRole(Role role) {
        UserRole userRole = new UserRole();
        userRole.setRole(role);
        userRole.setOrganization(role.getOrganization());
        return userRole;
    }

    private RolePermission rolePermission(Role role, String resource, String action) {
        PermissionGroup group = new PermissionGroup();
        group.setId(1);
        group.setName(resource);
        Permission permission = new Permission();
        permission.setId(action.hashCode());
        permission.setGroup(group);
        permission.setResource(resource);
        permission.setAction(action);
        RolePermission rolePermission = new RolePermission();
        rolePermission.setRole(role);
        rolePermission.setPermission(permission);
        return rolePermission;
    }
}
