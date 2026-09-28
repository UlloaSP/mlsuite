package dev.ulloasp.mlsuite.role.application.service;

import java.util.EnumSet;
import java.util.List;
import java.util.Set;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationRepository;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationRole;
import dev.ulloasp.mlsuite.role.adapter.out.persistence.repository.RoleDefinitionRepository;
import dev.ulloasp.mlsuite.role.adapter.out.persistence.repository.RoleTemplateRepository;
import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.role.domain.model.RoleDefinition;
import dev.ulloasp.mlsuite.role.domain.model.RoleScope;
import dev.ulloasp.mlsuite.role.domain.model.RoleTemplate;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class RoleSeedService implements ApplicationRunner {

    private static final String REVIEWER_SYSTEM_KEY = "REVIEWER";

    private final OrganizationRepository organizationRepository;
    private final RoleDefinitionRepository roleDefinitionRepository;
    private final RoleTemplateRepository roleTemplateRepository;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        seedTemplates();
        organizationRepository.findAll().forEach(this::ensureOrganizationRoles);
    }

    @Transactional
    public void ensureOrganizationRoles(Organization organization) {
        for (OrganizationRole role : OrganizationRole.values()) {
            orgRole(organization, role);
        }
    }

    public RoleDefinition orgRole(Organization org, OrganizationRole role) {
        Set<PermissionKey> permissions = systemPermissions(role);
        return roleDefinitionRepository.findByOrganizationIdAndSystemKey(org.getId(), role.name())
                .map(definition -> ensureSystemRolePermissions(definition, permissions))
                .orElseGet(() -> saveRole(new RoleDefinition(org, RoleScope.ORGANIZATION, label(role.name()), role.name().toLowerCase(), role.name()), permissions));
    }

    private RoleDefinition ensureSystemRolePermissions(RoleDefinition role, Set<PermissionKey> permissions) {
        if (!role.getPermissions().containsAll(permissions)) {
            role.getPermissions().addAll(permissions);
            return roleDefinitionRepository.save(role);
        }
        return role;
    }

    public RoleDefinition reviewerRole(Organization org) {
        return roleDefinitionRepository.findByOrganizationIdAndSystemKey(org.getId(), REVIEWER_SYSTEM_KEY)
                .map(this::ensureReviewPermission)
                .orElseGet(() -> {
                    RoleDefinition definition = new RoleDefinition(
                        org,
                        RoleScope.ORGANIZATION,
                        "Reviewer",
                        "reviewer",
                        REVIEWER_SYSTEM_KEY);
                    definition.setLocked(false);
                    return saveRole(definition, Set.of(PermissionKey.REVIEW));
                });
    }

    private RoleDefinition ensureReviewPermission(RoleDefinition role) {
        role.setLocked(false);
        if (!role.getPermissions().contains(PermissionKey.REVIEW)) {
            role.getPermissions().add(PermissionKey.REVIEW);
            return roleDefinitionRepository.save(role);
        }
        return role;
    }

    private RoleDefinition saveRole(RoleDefinition role, Set<PermissionKey> permissions) {
        role.setDescription(role.getName());
        role.setPermissions(permissions);
        return roleDefinitionRepository.save(role);
    }

    private void seedTemplates() {
        template("full-engineer", "Full Access Engineer", "Engineering", systemPermissions(OrganizationRole.MEMBER));
        template("read-only", "Read-Only Analyst", "Analytics", systemPermissions(OrganizationRole.VIEWER));
        template("inference", "Inference Operator", "Operations", Set.of(PermissionKey.VIEW_MODELS, PermissionKey.RUN_PREDICTIONS));
        template("reviewer", "Reviewer", "Review", Set.of(PermissionKey.REVIEW));
        template("data-scientist", "Data Scientist", "ML", systemPermissions(OrganizationRole.MEMBER));
    }

    private void template(String slug, String name, String category, Set<PermissionKey> permissions) {
        roleTemplateRepository.findBySlug(slug).orElseGet(() -> {
            RoleTemplate template = new RoleTemplate(name, slug, category, RoleScope.ORGANIZATION);
            template.setDescription(name);
            template.setPermissionKeys(permissions);
            return roleTemplateRepository.save(template);
        });
    }

    /** Minimum permissions every organization's system role carries. */
    private static Set<PermissionKey> systemPermissions(OrganizationRole role) {
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
