package dev.ulloasp.mlsuite.team.application.usecase;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.ulloasp.mlsuite.organization.domain.model.MembershipStatus;
import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.ModelRepository;
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationMembershipRepository;
import dev.ulloasp.mlsuite.role.adapter.out.persistence.repository.RoleDefinitionRepository;
import dev.ulloasp.mlsuite.role.application.service.RoleSeedService;
import dev.ulloasp.mlsuite.role.domain.model.RoleDefinition;
import dev.ulloasp.mlsuite.team.adapter.out.persistence.repository.TeamMembershipRepository;
import dev.ulloasp.mlsuite.team.adapter.out.persistence.repository.TeamRepository;
import dev.ulloasp.mlsuite.team.application.dto.CreateTeamRequest;
import dev.ulloasp.mlsuite.team.application.dto.TeamDetailDto;
import dev.ulloasp.mlsuite.team.application.dto.TeamDto;
import dev.ulloasp.mlsuite.team.application.dto.TeamMembershipDto;
import dev.ulloasp.mlsuite.team.application.dto.TeamMembershipRowDto;
import dev.ulloasp.mlsuite.team.application.dto.UpdateTeamMembershipRoleRequest;
import dev.ulloasp.mlsuite.team.application.dto.UpdateTeamRequest;
import dev.ulloasp.mlsuite.team.application.port.in.TeamManagementUseCase;
import dev.ulloasp.mlsuite.team.domain.model.Team;
import dev.ulloasp.mlsuite.team.domain.model.TeamMembership;
import dev.ulloasp.mlsuite.team.domain.model.TeamRole;
import dev.ulloasp.mlsuite.team.domain.model.TeamStatus;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;

@Service
@Transactional
public class TeamManagementService implements TeamManagementUseCase {

    private final WorkspaceAccessService workspaceAccessService;
    private final WorkspaceAuthorizationService workspaceAuthorizationService;
    private final TeamRepository teamRepository;
    private final TeamMembershipRepository teamMembershipRepository;
    private final OrganizationMembershipRepository organizationMembershipRepository;
    private final ModelRepository modelRepository;
    private final RoleSeedService roleSeedService;
    private final RoleDefinitionRepository roleDefinitionRepository;

    public TeamManagementService(
            WorkspaceAccessService workspaceAccessService,
            WorkspaceAuthorizationService workspaceAuthorizationService,
            TeamRepository teamRepository,
            TeamMembershipRepository teamMembershipRepository,
            OrganizationMembershipRepository organizationMembershipRepository,
            ModelRepository modelRepository,
            RoleSeedService roleSeedService,
            RoleDefinitionRepository roleDefinitionRepository) {
        this.workspaceAccessService = workspaceAccessService;
        this.workspaceAuthorizationService = workspaceAuthorizationService;
        this.teamRepository = teamRepository;
        this.teamMembershipRepository = teamMembershipRepository;
        this.organizationMembershipRepository = organizationMembershipRepository;
        this.modelRepository = modelRepository;
        this.roleSeedService = roleSeedService;
        this.roleDefinitionRepository = roleDefinitionRepository;
    }

    @Override
    public List<TeamDto> listTeams(Long userId, Long organizationId) {
        workspaceAuthorizationService.requireOrganizationRead(userId, organizationId);
        return teamRepository.findByOrganizationIdOrderByNameAsc(organizationId).stream()
                .map(this::toTeamDto)
                .toList();
    }

    @Override
    public TeamDto createTeam(Long userId, Long organizationId, CreateTeamRequest request) {
        if (!workspaceAuthorizationService.workspacePermissions(userId, organizationId).canCreateTeams()) {
            throw new dev.ulloasp.mlsuite.organization.domain.exception.OrganizationAccessDeniedException(organizationId);
        }
        Team team = new Team(
                workspaceAccessService.requireMembership(userId, organizationId).getOrganization(),
                normalizeSlug(request.slug(), request.name()),
                request.name().strip(),
                request.description());
        if (teamRepository.existsByOrganizationIdAndSlug(organizationId, team.getSlug())) {
            throw new IllegalArgumentException("Team slug already exists.");
        }
        applyTeamAdminFields(team, organizationId, request.leadMembershipId(), request.monthlyInferenceQuota(), null);
        Team saved = teamRepository.save(team);
        roleSeedService.ensureTeamRoles(saved);
        return toTeamDto(saved);
    }

    @Override
    public TeamDetailDto getTeam(Long userId, Long teamId) {
        Team team = workspaceAccessService.requireTeamInAccessibleOrganization(userId, teamId);
        workspaceAuthorizationService.requireTeamView(userId, team);
        roleSeedService.ensureTeamRoles(team);
        return TeamDetailDto.from(
                team,
                workspaceAuthorizationService.currentTeamRole(userId, teamId).map(Enum::name).orElse(null),
                workspaceAuthorizationService.teamPermissions(userId, team));
    }

    @Override
    public TeamDto updateTeam(Long userId, Long teamId, UpdateTeamRequest request) {
        Team team = workspaceAccessService.requireTeamInAccessibleOrganization(userId, teamId);
        workspaceAuthorizationService.requireTeamEdit(userId, team);
        if (request.name() != null && !request.name().isBlank()) {
            team.setName(request.name().strip());
        }
        team.setDescription(request.description());
        applyTeamAdminFields(
                team,
                team.getOrganization().getId(),
                request.leadMembershipId(),
                request.monthlyInferenceQuota(),
                request.status());
        return toTeamDto(teamRepository.save(team));
    }

    @Override
    public void deleteTeam(Long userId, Long teamId) {
        Team team = workspaceAccessService.requireTeamInAccessibleOrganization(userId, teamId);
        workspaceAuthorizationService.requireTeamDelete(userId, team);
        teamRepository.delete(team);
    }

    @Override
    public List<TeamMembershipRowDto> listMembers(Long userId, Long teamId) {
        Team team = workspaceAccessService.requireTeamInAccessibleOrganization(userId, teamId);
        workspaceAuthorizationService.requireTeamView(userId, team);
        roleSeedService.ensureTeamRoles(team);
        return teamMembershipRepository.findByTeamIdAndStatusOrderByCreatedAtAsc(team.getId(), MembershipStatus.ACTIVE)
                .stream()
                .map(membership -> TeamMembershipRowDto.from(
                        membership,
                        workspaceAuthorizationService.teamMemberActions(userId, team, membership)))
                .toList();
    }

    @Override
    public TeamMembershipDto updateMemberRole(Long userId, Long teamId, Long membershipId, UpdateTeamMembershipRoleRequest request) {
        Team team = workspaceAccessService.requireTeamInAccessibleOrganization(userId, teamId);
        workspaceAuthorizationService.requireTeamView(userId, team);
        TeamMembership membership = teamMembershipRepository.findById(membershipId)
                .orElseThrow(() -> new IllegalArgumentException("Team membership does not exist."));
        if (!membership.getTeam().getId().equals(teamId)) {
            throw new IllegalArgumentException("Team membership does not belong to team.");
        }
        var actions = workspaceAuthorizationService.teamMemberActions(userId, team, membership);
        Long nextRoleId = request.roleDefinitionId();
        boolean assignable = actions.assignableRoles().stream().anyMatch(role -> role.id().equals(nextRoleId));
        if (!actions.canChangeRole() || !assignable) {
            throw new IllegalArgumentException("Team membership role cannot be changed.");
        }
        RoleDefinition nextRole = roleDefinitionRepository.findByIdAndTeamId(nextRoleId, teamId)
                .orElseThrow(() -> new IllegalArgumentException("Role does not exist."));
        membership.setRoleDefinition(nextRole);
        if (nextRole.getSystemKey() != null) {
            membership.setRole(TeamRole.valueOf(nextRole.getSystemKey()));
        }
        return TeamMembershipDto.from(teamMembershipRepository.save(membership));
    }

    @Override
    public void removeMember(Long userId, Long teamId, Long membershipId) {
        Team team = workspaceAccessService.requireTeamInAccessibleOrganization(userId, teamId);
        workspaceAuthorizationService.requireTeamView(userId, team);
        TeamMembership membership = teamMembershipRepository.findById(membershipId)
                .orElseThrow(() -> new IllegalArgumentException("Team membership does not exist."));
        if (!membership.getTeam().getId().equals(teamId)) {
            throw new IllegalArgumentException("Team membership does not belong to team.");
        }
        if (!workspaceAuthorizationService.teamMemberActions(userId, team, membership).canRemove()) {
            throw new IllegalArgumentException("Team membership cannot be removed.");
        }
        membership.setStatus(MembershipStatus.REMOVED);
        teamMembershipRepository.save(membership);
    }

    private String normalizeSlug(String rawSlug, String rawName) {
        String base = (rawSlug != null && !rawSlug.isBlank() ? rawSlug : rawName)
                .toLowerCase()
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-|-$)", "");
        return base.isBlank() ? "team" : base;
    }

    private void applyTeamAdminFields(Team team, Long organizationId, Long leadMembershipId, Long quota, String status) {
        if (leadMembershipId != null) {
            var lead = organizationMembershipRepository.findById(leadMembershipId)
                    .orElseThrow(() -> new IllegalArgumentException("Lead membership does not exist."));
            if (!lead.getOrganization().getId().equals(organizationId) || lead.getStatus() != MembershipStatus.ACTIVE) {
                throw new IllegalArgumentException("Lead membership is invalid.");
            }
            team.setLeadMembership(lead);
        }
        team.setMonthlyInferenceQuota(quota);
        if (status != null && !status.isBlank()) {
            team.setStatus(TeamStatus.valueOf(status.trim().toUpperCase()));
        }
    }

    private TeamDto toTeamDto(Team team) {
        long members = teamMembershipRepository.countByTeamIdAndStatus(team.getId(), MembershipStatus.ACTIVE);
        return TeamDto.from(team, members, modelRepository.countByTeamId(team.getId()), 0);
    }
}
