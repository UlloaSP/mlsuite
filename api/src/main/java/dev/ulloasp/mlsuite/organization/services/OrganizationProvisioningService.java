package dev.ulloasp.mlsuite.organization.services;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.ulloasp.mlsuite.organization.entities.Organization;
import dev.ulloasp.mlsuite.organization.entities.OrganizationStatus;
import dev.ulloasp.mlsuite.organization.entities.OrganizationUser;
import dev.ulloasp.mlsuite.organization.entities.OrganizationUserStatus;
import dev.ulloasp.mlsuite.organization.repositories.OrganizationRepository;
import dev.ulloasp.mlsuite.organization.repositories.OrganizationUserRepository;
import dev.ulloasp.mlsuite.rbac.services.RbacBootstrapService;
import dev.ulloasp.mlsuite.rbac.services.RoleAssignmentService;
import dev.ulloasp.mlsuite.user.entity.User;

@Service
@Transactional
public class OrganizationProvisioningService {

    private final OrganizationRepository organizationRepository;
    private final OrganizationUserRepository organizationUserRepository;
    private final RbacBootstrapService rbacBootstrapService;
    private final RoleAssignmentService roleAssignmentService;

    public OrganizationProvisioningService(
            OrganizationRepository organizationRepository,
            OrganizationUserRepository organizationUserRepository,
            RbacBootstrapService rbacBootstrapService,
            RoleAssignmentService roleAssignmentService) {
        this.organizationRepository = organizationRepository;
        this.organizationUserRepository = organizationUserRepository;
        this.rbacBootstrapService = rbacBootstrapService;
        this.roleAssignmentService = roleAssignmentService;
    }

    public Organization ensurePersonalOrganization(User user) {
        String slug = user.getUsername() + "-" + user.getId();
        Organization organization = organizationRepository.findBySlug(slug).orElseGet(() -> {
            Organization created = new Organization();
            created.setName((user.getFullName() == null || user.getFullName().isBlank()
                    ? user.getUsername()
                    : user.getFullName()) + " Workspace");
            created.setSlug(slug);
            created.setBillingPlan("free");
            created.setStatus(OrganizationStatus.ACTIVE);
            return organizationRepository.save(created);
        });
        if (!organizationUserRepository.existsByUserIdAndOrganizationIdAndStatus(user.getId(), organization.getId(),
                OrganizationUserStatus.ACTIVE)) {
            organizationUserRepository.save(new OrganizationUser(organization, user, OrganizationUserStatus.ACTIVE));
        }
        rbacBootstrapService.ensureOrganizationRoles(organization);
        roleAssignmentService.assignRole(organization, user, "owner");
        return organization;
    }
}
