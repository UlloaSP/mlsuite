package dev.ulloasp.mlsuite.rbac.services;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.ulloasp.mlsuite.organization.entities.Organization;
import dev.ulloasp.mlsuite.rbac.entities.Role;
import dev.ulloasp.mlsuite.rbac.entities.UserRole;
import dev.ulloasp.mlsuite.rbac.entities.UserRoleId;
import dev.ulloasp.mlsuite.rbac.repositories.RoleRepository;
import dev.ulloasp.mlsuite.rbac.repositories.UserRoleRepository;
import dev.ulloasp.mlsuite.user.entity.User;

@Service
@Transactional
public class RoleAssignmentService {

    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;

    public RoleAssignmentService(RoleRepository roleRepository, UserRoleRepository userRoleRepository) {
        this.roleRepository = roleRepository;
        this.userRoleRepository = userRoleRepository;
    }

    public void assignRole(Organization organization, User user, String roleName) {
        Role role = roleRepository.findByOrganizationIdAndName(organization.getId(), roleName).orElseThrow();
        UserRoleId id = new UserRoleId(organization.getId(), user.getId(), role.getId());
        userRoleRepository.findById(id).orElseGet(() -> userRoleRepository.save(new UserRole(organization, user, role)));
    }
}
