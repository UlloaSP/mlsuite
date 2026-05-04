package dev.ulloasp.mlsuite.team.application.usecase;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.ulloasp.mlsuite.organization.domain.model.MembershipStatus;
import dev.ulloasp.mlsuite.team.adapter.out.persistence.repository.TeamMembershipRepository;
import dev.ulloasp.mlsuite.team.adapter.out.persistence.repository.TeamRepository;
import dev.ulloasp.mlsuite.team.application.dto.CreateTeamRequest;
import dev.ulloasp.mlsuite.team.application.dto.TeamDto;
import dev.ulloasp.mlsuite.team.application.dto.TeamMembershipDto;
import dev.ulloasp.mlsuite.team.application.dto.UpdateTeamMembershipRoleRequest;
import dev.ulloasp.mlsuite.team.application.dto.UpdateTeamRequest;
import dev.ulloasp.mlsuite.team.application.port.in.TeamManagementUseCase;
import dev.ulloasp.mlsuite.team.domain.model.Team;
import dev.ulloasp.mlsuite.team.domain.model.TeamMembership;
import dev.ulloasp.mlsuite.team.domain.model.TeamRole;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;

@Service
@Transactional
public class TeamManagementService implements TeamManagementUseCase {

    private final WorkspaceAccessService workspaceAccessService;
    private final TeamRepository teamRepository;
    private final TeamMembershipRepository teamMembershipRepository;

    public TeamManagementService(
            WorkspaceAccessService workspaceAccessService,
            TeamRepository teamRepository,
            TeamMembershipRepository teamMembershipRepository) {
        this.workspaceAccessService = workspaceAccessService;
        this.teamRepository = teamRepository;
        this.teamMembershipRepository = teamMembershipRepository;
    }

    @Override
    public List<TeamDto> listTeams(Long userId, Long organizationId) {
        workspaceAccessService.requireMembership(userId, organizationId);
        return teamRepository.findByOrganizationIdOrderByNameAsc(organizationId).stream().map(TeamDto::from).toList();
    }

    @Override
    public TeamDto createTeam(Long userId, Long organizationId, CreateTeamRequest request) {
        Team team = new Team(
                workspaceAccessService.requireAdminOrganization(userId, organizationId),
                normalizeSlug(request.slug(), request.name()),
                request.name().strip(),
                request.description());
        if (teamRepository.existsByOrganizationIdAndSlug(organizationId, team.getSlug())) {
            throw new IllegalArgumentException("Team slug already exists.");
        }
        return TeamDto.from(teamRepository.save(team));
    }

    @Override
    public TeamDto getTeam(Long userId, Long teamId) {
        return TeamDto.from(workspaceAccessService.requireTeamInAccessibleOrganization(userId, teamId));
    }

    @Override
    public TeamDto updateTeam(Long userId, Long teamId, UpdateTeamRequest request) {
        Team team = workspaceAccessService.requireTeamInAccessibleOrganization(userId, teamId);
        workspaceAccessService.requireAdminOrganization(userId, team.getOrganization().getId());
        team.setName(request.name().strip());
        team.setDescription(request.description());
        return TeamDto.from(teamRepository.save(team));
    }

    @Override
    public void deleteTeam(Long userId, Long teamId) {
        Team team = workspaceAccessService.requireTeamInAccessibleOrganization(userId, teamId);
        workspaceAccessService.requireAdminOrganization(userId, team.getOrganization().getId());
        teamRepository.delete(team);
    }

    @Override
    public List<TeamMembershipDto> listMembers(Long userId, Long teamId) {
        Team team = workspaceAccessService.requireTeamInAccessibleOrganization(userId, teamId);
        return teamMembershipRepository.findByTeamIdAndStatusOrderByCreatedAtAsc(team.getId(), MembershipStatus.ACTIVE)
                .stream()
                .map(TeamMembershipDto::from)
                .toList();
    }

    @Override
    public TeamMembershipDto updateMemberRole(Long userId, Long teamId, Long membershipId, UpdateTeamMembershipRoleRequest request) {
        Team team = workspaceAccessService.requireTeamInAccessibleOrganization(userId, teamId);
        workspaceAccessService.requireAdminOrganization(userId, team.getOrganization().getId());
        TeamMembership membership = teamMembershipRepository.findById(membershipId)
                .orElseThrow(() -> new IllegalArgumentException("Team membership does not exist."));
        if (!membership.getTeam().getId().equals(teamId)) {
            throw new IllegalArgumentException("Team membership does not belong to team.");
        }
        membership.setRole(TeamRole.valueOf(request.role().trim().toUpperCase()));
        return TeamMembershipDto.from(teamMembershipRepository.save(membership));
    }

    @Override
    public void removeMember(Long userId, Long teamId, Long membershipId) {
        Team team = workspaceAccessService.requireTeamInAccessibleOrganization(userId, teamId);
        workspaceAccessService.requireAdminOrganization(userId, team.getOrganization().getId());
        TeamMembership membership = teamMembershipRepository.findById(membershipId)
                .orElseThrow(() -> new IllegalArgumentException("Team membership does not exist."));
        if (!membership.getTeam().getId().equals(teamId)) {
            throw new IllegalArgumentException("Team membership does not belong to team.");
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
}
