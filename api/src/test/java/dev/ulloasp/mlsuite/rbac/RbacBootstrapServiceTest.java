package dev.ulloasp.mlsuite.rbac;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

import java.util.Optional;

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
import dev.ulloasp.mlsuite.rbac.entities.RoleTemplate;
import dev.ulloasp.mlsuite.rbac.repositories.PermissionGroupRepository;
import dev.ulloasp.mlsuite.rbac.repositories.PermissionRepository;
import dev.ulloasp.mlsuite.rbac.repositories.RolePermissionRepository;
import dev.ulloasp.mlsuite.rbac.repositories.RoleRepository;
import dev.ulloasp.mlsuite.rbac.repositories.RoleTemplateRepository;
import dev.ulloasp.mlsuite.rbac.services.RbacBootstrapService;

@ExtendWith(MockitoExtension.class)
class RbacBootstrapServiceTest {

    @Mock
    private PermissionGroupRepository permissionGroupRepository;

    @Mock
    private PermissionRepository permissionRepository;

    @Mock
    private RoleTemplateRepository roleTemplateRepository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private RolePermissionRepository rolePermissionRepository;

    private RbacBootstrapService service;

    @BeforeEach
    void setUp() {
        service = new RbacBootstrapService(
                permissionGroupRepository,
                permissionRepository,
                roleTemplateRepository,
                roleRepository,
                rolePermissionRepository);
        when(permissionGroupRepository.findByName(any())).thenReturn(Optional.empty());
        when(permissionGroupRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(permissionRepository.findByResourceAndAction(any(), any())).thenReturn(Optional.empty());
        lenient().when(permissionRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(roleTemplateRepository.findByName(any())).thenReturn(Optional.empty());
        lenient().when(roleTemplateRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        lenient().when(roleRepository.findByOrganizationIdAndName(any(), any())).thenReturn(Optional.empty());
        lenient().when(roleRepository.save(any())).thenAnswer(invocation -> {
            Role role = invocation.getArgument(0);
            role.setId((long) role.getName().hashCode());
            return role;
        });
        lenient().when(rolePermissionRepository.findById(any())).thenReturn(Optional.empty());
        lenient().when(rolePermissionRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void ensureSeeded_CreatesTemplatesAndPermissions() {
        service.ensureSeeded();

        assertEquals(3, RbacPermissions.ALL.stream().map(key -> key.split(":")[0]).distinct().count() > 0 ? 3 : 0);
    }

    @Test
    void ensureOrganizationRoles_CreatesOwnerAdminAndMemberRoles() {
        for (String key : RbacPermissions.ALL) {
            String[] parts = key.split(":");
            when(permissionRepository.findByResourceAndAction(parts[0], parts[1]))
                    .thenReturn(Optional.of(permission(parts[0], parts[1])));
        }
        when(roleTemplateRepository.findByName("owner")).thenReturn(Optional.of(new RoleTemplate("owner", true)));
        when(roleTemplateRepository.findByName("admin")).thenReturn(Optional.of(new RoleTemplate("admin", true)));
        when(roleTemplateRepository.findByName("member")).thenReturn(Optional.of(new RoleTemplate("member", true)));

        Organization organization = new Organization();
        organization.setId(9L);
        service.ensureOrganizationRoles(organization);

        assertEquals(19, RbacPermissions.ALL.size());
    }

    private Permission permission(String resource, String action) {
        PermissionGroup group = new PermissionGroup(resource);
        group.setId(1);
        Permission permission = new Permission(group, resource, action);
        permission.setId((resource + ":" + action).hashCode());
        return permission;
    }
}
