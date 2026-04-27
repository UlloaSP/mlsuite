package dev.ulloasp.mlsuite.auth.service;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;
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
import dev.ulloasp.mlsuite.user.repository.UserRepository;

@Component
@Transactional
public class BootstrapAdminService implements ApplicationRunner {

    private final Environment environment;
    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    private final OrganizationUserRepository organizationUserRepository;
    private final LocalUserProvisioningService localUserProvisioningService;
    private final RbacBootstrapService rbacBootstrapService;
    private final RoleAssignmentService roleAssignmentService;

    public BootstrapAdminService(
            Environment environment,
            UserRepository userRepository,
            OrganizationRepository organizationRepository,
            OrganizationUserRepository organizationUserRepository,
            LocalUserProvisioningService localUserProvisioningService,
            RbacBootstrapService rbacBootstrapService,
            RoleAssignmentService roleAssignmentService) {
        this.environment = environment;
        this.userRepository = userRepository;
        this.organizationRepository = organizationRepository;
        this.organizationUserRepository = organizationUserRepository;
        this.localUserProvisioningService = localUserProvisioningService;
        this.rbacBootstrapService = rbacBootstrapService;
        this.roleAssignmentService = roleAssignmentService;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!environment.getProperty("AUTH_BOOTSTRAP_ENABLED", Boolean.class, false)) {
            return;
        }
        String email = required("AUTH_BOOTSTRAP_EMAIL");
        String password = required("AUTH_BOOTSTRAP_PASSWORD");
        String fullName = required("AUTH_BOOTSTRAP_FULL_NAME");
        String username = required("AUTH_BOOTSTRAP_USERNAME");
        String orgName = required("AUTH_BOOTSTRAP_ORG_NAME");
        String orgSlug = required("AUTH_BOOTSTRAP_ORG_SLUG");

        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseGet(() -> localUserProvisioningService.register(email, password, fullName, username));
        user.setSuperadmin(true);
        if (user.getPasswordHash() == null || user.getPasswordHash().isBlank()) {
            localUserProvisioningService.setPassword(email, password);
        }
        Organization organization = organizationRepository.findBySlug(orgSlug).orElseGet(() -> {
            Organization created = new Organization();
            created.setName(orgName);
            created.setSlug(orgSlug);
            created.setBillingPlan("free");
            created.setStatus(OrganizationStatus.ACTIVE);
            return organizationRepository.save(created);
        });
        if (!organizationUserRepository.existsByUserIdAndOrganizationIdAndStatus(
                user.getId(),
                organization.getId(),
                OrganizationUserStatus.ACTIVE)) {
            organizationUserRepository.save(new OrganizationUser(organization, user, OrganizationUserStatus.ACTIVE));
        }
        rbacBootstrapService.ensureOrganizationRoles(organization);
        roleAssignmentService.assignRole(organization, user, "owner");
    }

    private String required(String key) {
        String value = environment.getProperty(key);
        if (value == null || value.isBlank()) {
            throw new IllegalStateException("Missing required bootstrap auth env var: " + key);
        }
        return value.trim();
    }
}
