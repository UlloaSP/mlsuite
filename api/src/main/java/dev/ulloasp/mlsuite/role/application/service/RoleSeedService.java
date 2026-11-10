package dev.ulloasp.mlsuite.role.application.service;

import dev.ulloasp.mlsuite.principal.application.service.Principals;
import dev.ulloasp.mlsuite.principal.domain.model.Principal;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationRole;
import dev.ulloasp.mlsuite.role.adapter.out.persistence.repository.RoleDefinitionRepository;
import dev.ulloasp.mlsuite.role.adapter.out.persistence.repository.RoleTemplateRepository;
import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.role.domain.model.RoleDefinition;
import dev.ulloasp.mlsuite.role.domain.model.RoleTemplate;
import lombok.RequiredArgsConstructor;

/**
 * The roles every organization has: one per {@link OrganizationRole}, with the permissions below,
 * and an editable Reviewer role, all created with the organization. A later change to these
 * permissions reaches existing organizations through a Flyway migration, never at startup. The
 * role templates are the platform's own rows, written on startup when missing.
 */
@Service
@RequiredArgsConstructor
public class RoleSeedService implements ApplicationRunner {

    private static final String REVIEWER_SYSTEM_KEY = "REVIEWER";

    private final RoleDefinitionRepository roleDefinitionRepository;
    private final RoleTemplateRepository roleTemplateRepository;
    private final Principals principals;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        template("full-engineer", "Full Access Engineer", "Engineering", systemPermissions(OrganizationRole.MEMBER));
        template("read-only", "Read-Only Analyst", "Analytics", systemPermissions(OrganizationRole.VIEWER));
        template("inference", "Inference Operator", "Operations", Set.of(PermissionKey.VIEW_MODELS, PermissionKey.RUN_PREDICTIONS));
        template("reviewer", "Reviewer", "Review", Set.of(PermissionKey.REVIEW));
        template("data-scientist", "Data Scientist", "ML", systemPermissions(OrganizationRole.MEMBER));
    }

    /** Gives an organization just saved its system roles and its Reviewer role. */
    @Transactional
    public void createOrganizationRoles(Organization organization) {
        Principal platform = principals.system();
        for (OrganizationRole role : OrganizationRole.values()) {
            save(new RoleDefinition(organization, label(role.name()),
                    role.name().toLowerCase(), role.name(), platform), systemPermissions(role));
        }
        RoleDefinition reviewer = new RoleDefinition(organization, "Reviewer", "reviewer",
                REVIEWER_SYSTEM_KEY, platform);
        reviewer.setLocked(false);
        save(reviewer, Set.of(PermissionKey.REVIEW));
    }

    /** The organization's system role {@code role}, which it has had since it was created. */
    public RoleDefinition orgRole(Organization organization, OrganizationRole role) {
        return roleDefinitionRepository.findByOrganizationIdAndSystemKey(organization.getId(), role.name())
                .orElseThrow(() -> new IllegalStateException(
                        "Organization " + organization.getId() + " has no " + role + " role"));
    }

    private void save(RoleDefinition role, Set<PermissionKey> permissions) {
        role.setDescription(role.getName());
        role.setPermissions(permissions);
        roleDefinitionRepository.save(role);
    }

    private void template(String slug, String name, String category, Set<PermissionKey> permissions) {
        roleTemplateRepository.findBySlug(slug).orElseGet(() -> {
            RoleTemplate template = new RoleTemplate(name, slug, category);
            template.setDescription(name);
            template.setPermissionKeys(permissions);
            return roleTemplateRepository.save(template);
        });
    }

    /** The permissions of every organization's system role. */
    public static Set<PermissionKey> systemPermissions(OrganizationRole role) {
        return switch (role) {
            case OWNER -> EnumSet.allOf(PermissionKey.class);
            case ADMIN -> EnumSet.complementOf(EnumSet.of(PermissionKey.DELETE_ORGANIZATION, PermissionKey.TRANSFER_OWNERSHIP));
            case MEMBER -> EnumSet.of(
                    PermissionKey.VIEW_WORKSPACE,
                    PermissionKey.VIEW_ORGANIZATION,
                    PermissionKey.VIEW_MODELS,
                    PermissionKey.CREATE_MODELS,
                    PermissionKey.EDIT_MODELS,
                    PermissionKey.DELETE_MODELS,
                    PermissionKey.RUN_PREDICTIONS,
                    PermissionKey.VIEW_PLUGINS);
            case VIEWER -> EnumSet.of(
                    PermissionKey.VIEW_WORKSPACE,
                    PermissionKey.VIEW_ORGANIZATION,
                    PermissionKey.VIEW_MODELS,
                    PermissionKey.VIEW_PLUGINS);
        };
    }

    private String label(String value) {
        return String.join(" ", List.of(value.toLowerCase().split("_"))).replaceFirst("^.", value.substring(0, 1));
    }
}
