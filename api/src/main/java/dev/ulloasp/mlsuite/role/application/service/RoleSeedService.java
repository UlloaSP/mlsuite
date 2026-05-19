package dev.ulloasp.mlsuite.role.application.service;

import java.util.List;
import java.util.Set;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationMembershipRepository;
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationRepository;
import dev.ulloasp.mlsuite.organization.domain.model.MembershipStatus;
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
import dev.ulloasp.mlsuite.team.adapter.out.persistence.repository.TeamMembershipRepository;
import dev.ulloasp.mlsuite.team.adapter.out.persistence.repository.TeamRepository;
import dev.ulloasp.mlsuite.team.domain.model.Team;
import dev.ulloasp.mlsuite.team.domain.model.TeamMembership;
import dev.ulloasp.mlsuite.team.domain.model.TeamRole;

@Service
public class RoleSeedService implements ApplicationRunner {

    private final OrganizationRepository organizationRepository;
    private final TeamRepository teamRepository;
    private final OrganizationMembershipRepository orgMembershipRepository;
    private final TeamMembershipRepository teamMembershipRepository;
    private final RoleDefinitionRepository roleDefinitionRepository;
    private final RoleTemplateRepository roleTemplateRepository;
    private final LegacyRolePermissionMapper mapper;

    public RoleSeedService(
            OrganizationRepository organizationRepository,
            TeamRepository teamRepository,
            OrganizationMembershipRepository orgMembershipRepository,
            TeamMembershipRepository teamMembershipRepository,
            RoleDefinitionRepository roleDefinitionRepository,
            RoleTemplateRepository roleTemplateRepository,
            LegacyRolePermissionMapper mapper) {
        this.organizationRepository = organizationRepository;
        this.teamRepository = teamRepository;
        this.orgMembershipRepository = orgMembershipRepository;
        this.teamMembershipRepository = teamMembershipRepository;
        this.roleDefinitionRepository = roleDefinitionRepository;
        this.roleTemplateRepository = roleTemplateRepository;
        this.mapper = mapper;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        seedTemplates();
        organizationRepository.findAll().forEach(this::ensureOrganizationRoles);
        teamRepository.findAll().forEach(this::ensureTeamRoles);
    }

    @Transactional
    public void ensureOrganizationRoles(Organization organization) {
        for (OrganizationRole role : OrganizationRole.values()) {
            RoleDefinition def = orgRole(organization, role);
            orgMembershipRepository.findByOrganizationIdAndStatusOrderByCreatedAtAsc(organization.getId(), MembershipStatus.ACTIVE)
                    .stream()
                    .filter(membership -> membership.getRoleDefinition() == null && membership.getRole() == role)
                    .forEach(membership -> membership.setRoleDefinition(def));
        }
    }

    @Transactional
    public void ensureTeamRoles(Team team) {
        for (TeamRole role : TeamRole.values()) {
            RoleDefinition def = teamRole(team, role);
            teamMembershipRepository.findByTeamIdAndStatusOrderByCreatedAtAsc(team.getId(), MembershipStatus.ACTIVE)
                    .stream()
                    .filter(membership -> membership.getRoleDefinition() == null && membership.getRole() == role)
                    .forEach(membership -> membership.setRoleDefinition(def));
        }
    }

    public RoleDefinition orgRole(Organization org, OrganizationRole role) {
        return roleDefinitionRepository.findByOrganizationIdAndSystemKey(org.getId(), role.name())
                .orElseGet(() -> saveRole(new RoleDefinition(org, null, RoleScope.ORGANIZATION, label(role.name()), role.name().toLowerCase(), role.name()), mapper.organization(role)));
    }

    public RoleDefinition externalReviewerRole(Organization org) {
        OrganizationSystemRole role = OrganizationSystemRole.EXTERNAL_REVIEWER;
        return roleDefinitionRepository.findByOrganizationIdAndSystemKey(org.getId(), role.systemKey())
                .map(this::ensureExternalReviewPermission)
                .orElseGet(() -> {
                    RoleDefinition definition = new RoleDefinition(
                        org,
                        null,
                        RoleScope.ORGANIZATION,
                        role.label(),
                        role.slug(),
                        role.systemKey());
                    definition.setLocked(false);
                    return saveRole(definition, Set.of(PermissionKey.EXTERNAL_REVIEW));
                });
    }

    private RoleDefinition ensureExternalReviewPermission(RoleDefinition role) {
        role.setLocked(false);
        if (!role.getPermissions().contains(PermissionKey.EXTERNAL_REVIEW)) {
            role.getPermissions().add(PermissionKey.EXTERNAL_REVIEW);
            return roleDefinitionRepository.save(role);
        }
        return role;
    }

    public RoleDefinition teamRole(Team team, TeamRole role) {
        return roleDefinitionRepository.findByTeamIdAndSystemKey(team.getId(), role.name())
                .orElseGet(() -> saveRole(new RoleDefinition(null, team, RoleScope.TEAM, label(role.name()), role.name().toLowerCase(), role.name()), mapper.team(role)));
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
        template("external-reviewer", "External Reviewer", "Review", Set.of(PermissionKey.EXTERNAL_REVIEW));
        template("team-manager", "Team Manager", "Management", mapper.organization(OrganizationRole.ADMIN));
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
