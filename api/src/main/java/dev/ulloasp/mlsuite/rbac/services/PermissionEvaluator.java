package dev.ulloasp.mlsuite.rbac.services;

import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import dev.ulloasp.mlsuite.rbac.RbacPermissions;
import dev.ulloasp.mlsuite.rbac.repositories.RolePermissionRepository;
import dev.ulloasp.mlsuite.rbac.repositories.UserRoleRepository;
import dev.ulloasp.mlsuite.security.tenant.PermissionDeniedException;

@Service
public class PermissionEvaluator {

    private final UserRoleRepository userRoleRepository;
    private final RolePermissionRepository rolePermissionRepository;

    public PermissionEvaluator(
            UserRoleRepository userRoleRepository,
            RolePermissionRepository rolePermissionRepository) {
        this.userRoleRepository = userRoleRepository;
        this.rolePermissionRepository = rolePermissionRepository;
    }

    public Set<String> resolvePermissions(Long organizationId, Long userId, boolean isSuperadmin) {
        if (isSuperadmin) {
            return Set.copyOf(RbacPermissions.ALL);
        }
        return userRoleRepository.findByOrganizationIdAndUserId(organizationId, userId).stream()
                .flatMap(userRole -> rolePermissionRepository.findByRoleId(userRole.getRole().getId()).stream())
                .map(rolePermission -> rolePermission.getPermission().key())
                .collect(Collectors.toSet());
    }

    public void requirePermission(Set<String> permissions, String permission) {
        if (!permissions.contains(permission)) {
            throw new PermissionDeniedException(permission);
        }
    }
}
