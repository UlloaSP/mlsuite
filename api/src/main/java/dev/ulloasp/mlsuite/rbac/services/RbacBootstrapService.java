package dev.ulloasp.mlsuite.rbac.services;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.ulloasp.mlsuite.organization.entities.Organization;
import dev.ulloasp.mlsuite.rbac.RbacPermissions;
import dev.ulloasp.mlsuite.rbac.entities.Permission;
import dev.ulloasp.mlsuite.rbac.entities.PermissionGroup;
import dev.ulloasp.mlsuite.rbac.entities.Role;
import dev.ulloasp.mlsuite.rbac.entities.RolePermission;
import dev.ulloasp.mlsuite.rbac.entities.RolePermissionId;
import dev.ulloasp.mlsuite.rbac.entities.RoleTemplate;
import dev.ulloasp.mlsuite.rbac.repositories.PermissionGroupRepository;
import dev.ulloasp.mlsuite.rbac.repositories.PermissionRepository;
import dev.ulloasp.mlsuite.rbac.repositories.RolePermissionRepository;
import dev.ulloasp.mlsuite.rbac.repositories.RoleRepository;
import dev.ulloasp.mlsuite.rbac.repositories.RoleTemplateRepository;

@Service
@Transactional
public class RbacBootstrapService {

    private final PermissionGroupRepository permissionGroupRepository;
    private final PermissionRepository permissionRepository;
    private final RoleTemplateRepository roleTemplateRepository;
    private final RoleRepository roleRepository;
    private final RolePermissionRepository rolePermissionRepository;

    public RbacBootstrapService(
            PermissionGroupRepository permissionGroupRepository,
            PermissionRepository permissionRepository,
            RoleTemplateRepository roleTemplateRepository,
            RoleRepository roleRepository,
            RolePermissionRepository rolePermissionRepository) {
        this.permissionGroupRepository = permissionGroupRepository;
        this.permissionRepository = permissionRepository;
        this.roleTemplateRepository = roleTemplateRepository;
        this.roleRepository = roleRepository;
        this.rolePermissionRepository = rolePermissionRepository;
    }

    public void ensureSeeded() {
        Map<String, PermissionGroup> groups = new LinkedHashMap<>();
        List.of("organization", "members", "roles", "models", "signatures", "predictions", "feedback", "plugins")
                .forEach(name -> groups.put(name, permissionGroupRepository.findByName(name)
                        .orElseGet(() -> permissionGroupRepository.save(new PermissionGroup(name)))));
        for (String key : RbacPermissions.ALL) {
            String[] parts = key.split(":");
            permissionRepository.findByResourceAndAction(parts[0], parts[1])
                    .orElseGet(() -> permissionRepository.save(new Permission(groups.get(parts[0]), parts[0], parts[1])));
        }
        template("owner");
        template("admin");
        template("member");
    }

    public void ensureOrganizationRoles(Organization organization) {
        ensureSeeded();
        ensureRole(organization, "owner", false, RbacPermissions.ALL);
        ensureRole(organization, "admin", false, List.of(
                RbacPermissions.ORGANIZATION_READ,
                RbacPermissions.ORGANIZATION_UPDATE,
                RbacPermissions.MEMBERS_READ,
                RbacPermissions.MEMBERS_MANAGE,
                RbacPermissions.ROLES_READ,
                RbacPermissions.ROLES_MANAGE,
                RbacPermissions.MODELS_READ,
                RbacPermissions.MODELS_CREATE,
                RbacPermissions.MODELS_DELETE,
                RbacPermissions.SIGNATURES_READ,
                RbacPermissions.SIGNATURES_CREATE,
                RbacPermissions.PREDICTIONS_READ,
                RbacPermissions.PREDICTIONS_CREATE,
                RbacPermissions.PREDICTIONS_UPDATE,
                RbacPermissions.FEEDBACK_READ,
                RbacPermissions.FEEDBACK_CREATE,
                RbacPermissions.FEEDBACK_UPDATE,
                RbacPermissions.PLUGINS_READ,
                RbacPermissions.PLUGINS_MANAGE));
        ensureRole(organization, "member", false, List.of(
                RbacPermissions.ORGANIZATION_READ,
                RbacPermissions.MODELS_READ,
                RbacPermissions.MODELS_CREATE,
                RbacPermissions.SIGNATURES_READ,
                RbacPermissions.SIGNATURES_CREATE,
                RbacPermissions.PREDICTIONS_READ,
                RbacPermissions.PREDICTIONS_CREATE,
                RbacPermissions.PREDICTIONS_UPDATE,
                RbacPermissions.FEEDBACK_READ,
                RbacPermissions.FEEDBACK_CREATE,
                RbacPermissions.FEEDBACK_UPDATE,
                RbacPermissions.PLUGINS_READ));
    }

    private RoleTemplate template(String name) {
        return roleTemplateRepository.findByName(name)
                .orElseGet(() -> roleTemplateRepository.save(new RoleTemplate(name, true)));
    }

    private void ensureRole(Organization organization, String name, boolean custom, List<String> permissionKeys) {
        Role role = roleRepository.findByOrganizationIdAndName(organization.getId(), name)
                .orElseGet(() -> roleRepository.save(new Role(
                        organization,
                        roleTemplateRepository.findByName(name).orElse(null),
                        name,
                        custom)));
        for (String key : permissionKeys) {
            String[] parts = key.split(":");
            Permission permission = permissionRepository.findByResourceAndAction(parts[0], parts[1]).orElseThrow();
            RolePermissionId id = new RolePermissionId(role.getId(), permission.getId());
            rolePermissionRepository.findById(id)
                    .orElseGet(() -> rolePermissionRepository.save(new RolePermission(role, permission)));
        }
    }
}
