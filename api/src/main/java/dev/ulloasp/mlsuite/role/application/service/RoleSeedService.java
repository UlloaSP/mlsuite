package dev.ulloasp.mlsuite.role.application.service;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.ulloasp.mlsuite.invitation.adapter.out.persistence.repository.InvitationRepository;
import dev.ulloasp.mlsuite.invitation.domain.model.Invitation;
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationMembershipRepository;
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationRepository;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationMembership;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationRole;
import dev.ulloasp.mlsuite.role.adapter.out.persistence.repository.RoleDefinitionRepository;
import dev.ulloasp.mlsuite.role.adapter.out.persistence.repository.RoleTemplateRepository;
import dev.ulloasp.mlsuite.role.domain.model.OrganizationSystemRole;
import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.role.domain.model.RoleDefinition;
import dev.ulloasp.mlsuite.role.domain.model.RoleScope;
import dev.ulloasp.mlsuite.role.domain.model.RoleTemplate;

@Service
public class RoleSeedService implements ApplicationRunner {

    private final OrganizationRepository organizationRepository;
    private final OrganizationMembershipRepository orgMembershipRepository;
    private final InvitationRepository invitationRepository;
    private final RoleDefinitionRepository roleDefinitionRepository;
    private final RoleTemplateRepository roleTemplateRepository;
    private final LegacyRolePermissionMapper mapper;

    public RoleSeedService(
            OrganizationRepository organizationRepository,
            OrganizationMembershipRepository orgMembershipRepository,
            InvitationRepository invitationRepository,
            RoleDefinitionRepository roleDefinitionRepository,
            RoleTemplateRepository roleTemplateRepository,
            LegacyRolePermissionMapper mapper) {
        this.organizationRepository = organizationRepository;
        this.orgMembershipRepository = orgMembershipRepository;
        this.invitationRepository = invitationRepository;
        this.roleDefinitionRepository = roleDefinitionRepository;
        this.roleTemplateRepository = roleTemplateRepository;
        this.mapper = mapper;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        seedTemplates();
        organizationRepository.findAll().forEach(organization -> {
            Map<OrganizationRole, RoleDefinition> systemRoles = organizationRoles(organization);
            migrateLegacyAssignments(organization, systemRoles);
        });
    }

    @Transactional
    public void ensureOrganizationRoles(Organization organization) {
        organizationRoles(organization);
    }

    private Map<OrganizationRole, RoleDefinition> organizationRoles(Organization organization) {
        Map<OrganizationRole, RoleDefinition> roles = new EnumMap<>(OrganizationRole.class);
        for (OrganizationRole role : OrganizationRole.values()) {
            roles.put(role, orgRole(organization, role));
        }
        return roles;
    }

    private void migrateLegacyAssignments(
            Organization organization,
            Map<OrganizationRole, RoleDefinition> systemRoles) {
        List<OrganizationMembership> memberships = orgMembershipRepository.findByOrganizationId(organization.getId()).stream()
                .filter(membership -> membership.getRoleDefinition() == null)
                .toList();
        memberships.forEach(membership -> membership.setRoleDefinition(systemRoles.get(membership.getRole())));
        if (!memberships.isEmpty()) {
            orgMembershipRepository.saveAll(memberships);
        }

        List<Invitation> invitations = invitationRepository.findByOrganizationIdOrderByCreatedAtDesc(organization.getId()).stream()
                .filter(invitation -> invitation.getRoleDefinition() == null)
                .toList();
        invitations.forEach(invitation -> invitation.setRoleDefinition(systemRoles.get(invitation.getRole())));
        if (!invitations.isEmpty()) {
            invitationRepository.saveAll(invitations);
        }
    }

    public RoleDefinition orgRole(Organization org, OrganizationRole role) {
        return roleDefinitionRepository.findByOrganizationIdAndSystemKey(org.getId(), role.name())
                .map(definition -> ensureSystemRolePermissions(definition, mapper.organization(role)))
                .orElseGet(() -> saveRole(new RoleDefinition(org, RoleScope.ORGANIZATION, label(role.name()), role.name().toLowerCase(), role.name()), mapper.organization(role)));
    }

    private RoleDefinition ensureSystemRolePermissions(RoleDefinition role, Set<PermissionKey> permissions) {
        if (!role.getPermissions().containsAll(permissions)) {
            role.getPermissions().addAll(permissions);
            return roleDefinitionRepository.save(role);
        }
        return role;
    }

    public RoleDefinition reviewerRole(Organization org) {
        OrganizationSystemRole role = OrganizationSystemRole.REVIEWER;
        return roleDefinitionRepository.findByOrganizationIdAndSystemKey(org.getId(), role.systemKey())
                .map(this::ensureReviewPermission)
                .orElseGet(() -> {
                    RoleDefinition definition = new RoleDefinition(
                        org,
                        RoleScope.ORGANIZATION,
                        role.label(),
                        role.slug(),
                        role.systemKey());
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
        template("full-engineer", "Full Access Engineer", "Engineering", mapper.organization(OrganizationRole.MEMBER));
        template("read-only", "Read-Only Analyst", "Analytics", mapper.organization(OrganizationRole.VIEWER));
        template("inference", "Inference Operator", "Operations", Set.of(PermissionKey.VIEW_MODELS, PermissionKey.RUN_PREDICTIONS));
        template("reviewer", "Reviewer", "Review", Set.of(PermissionKey.REVIEW));
        template("data-scientist", "Data Scientist", "ML", mapper.organization(OrganizationRole.MEMBER));
    }

    private void template(String slug, String name, String category, Set<PermissionKey> permissions) {
        roleTemplateRepository.findBySlug(slug).orElseGet(() -> {
            RoleTemplate template = new RoleTemplate(name, slug, category, RoleScope.ORGANIZATION);
            template.setDescription(name);
            template.setPermissionKeys(permissions);
            return roleTemplateRepository.save(template);
        });
    }

    private String label(String value) {
        return String.join(" ", List.of(value.toLowerCase().split("_"))).replaceFirst("^.", value.substring(0, 1));
    }
}
