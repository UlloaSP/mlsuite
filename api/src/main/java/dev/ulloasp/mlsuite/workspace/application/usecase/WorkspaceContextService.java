package dev.ulloasp.mlsuite.workspace.application.usecase;

import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.ulloasp.mlsuite.invitation.adapter.out.persistence.repository.InvitationRepository;
import dev.ulloasp.mlsuite.invitation.application.dto.InvitationDto;
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationMembershipRepository;
import dev.ulloasp.mlsuite.organization.application.dto.OrganizationDto;
import dev.ulloasp.mlsuite.organization.application.dto.OrganizationMembershipDto;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationMembership;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationRole;
import dev.ulloasp.mlsuite.team.adapter.out.persistence.repository.TeamRepository;
import dev.ulloasp.mlsuite.team.application.dto.TeamDto;
import dev.ulloasp.mlsuite.user.adapter.out.persistence.repository.UserRepository;
import dev.ulloasp.mlsuite.workspace.application.dto.SelectOrganizationRequest;
import dev.ulloasp.mlsuite.workspace.application.dto.WorkspaceContextDto;
import dev.ulloasp.mlsuite.workspace.application.dto.WorkspaceUserDto;
import dev.ulloasp.mlsuite.workspace.application.port.in.WorkspaceContextUseCase;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;

@Service
@Transactional
public class WorkspaceContextService implements WorkspaceContextUseCase {

    private final WorkspaceAccessService workspaceAccessService;
    private final UserRepository userRepository;
    private final OrganizationMembershipRepository membershipRepository;
    private final TeamRepository teamRepository;
    private final InvitationRepository invitationRepository;

    public WorkspaceContextService(
            WorkspaceAccessService workspaceAccessService,
            UserRepository userRepository,
            OrganizationMembershipRepository membershipRepository,
            TeamRepository teamRepository,
            InvitationRepository invitationRepository) {
        this.workspaceAccessService = workspaceAccessService;
        this.userRepository = userRepository;
        this.membershipRepository = membershipRepository;
        this.teamRepository = teamRepository;
        this.invitationRepository = invitationRepository;
    }

    @Override
    public WorkspaceContextDto getContext(Long userId) {
        var user = workspaceAccessService.requireUser(userId);
        var currentOrganization = workspaceAccessService.requireCurrentOrganization(userId);
        List<OrganizationMembership> memberships = membershipRepository.findActiveByUserId(userId);
        OrganizationMembership currentMembership = memberships.stream()
                .filter(membership -> membership.getOrganization().getId().equals(currentOrganization.getId()))
                .findFirst()
                .orElseThrow();
        return new WorkspaceContextDto(
                WorkspaceUserDto.from(user),
                memberships.stream().map(OrganizationMembershipDto::from).toList(),
                memberships.stream().map(OrganizationMembership::getOrganization).map(OrganizationDto::from).toList(),
                OrganizationDto.from(currentOrganization),
                OrganizationMembershipDto.from(currentMembership),
                teamRepository.findByOrganizationIdOrderByNameAsc(currentOrganization.getId()).stream().map(TeamDto::from).toList(),
                invitationRepository.findByOrganizationIdOrderByCreatedAtDesc(currentOrganization.getId()).stream().map(InvitationDto::from).toList(),
                permissionsFor(currentMembership.getRole()));
    }

    @Override
    public WorkspaceContextDto selectOrganization(Long userId, SelectOrganizationRequest request) {
        var user = workspaceAccessService.requireUser(userId);
        var membership = workspaceAccessService.requireMembership(userId, request.organizationId());
        user.setCurrentOrganization(membership.getOrganization());
        userRepository.save(user);
        return getContext(userId);
    }

    private Map<String, Boolean> permissionsFor(OrganizationRole role) {
        boolean canManage = role == OrganizationRole.OWNER || role == OrganizationRole.ADMIN;
        return Map.of(
                "canManageOrganization", canManage || role == OrganizationRole.MEMBER,
                "canInviteMembers", canManage,
                "canManageMembers", canManage,
                "canManageTeams", canManage,
                "canDeleteOrganization", role == OrganizationRole.OWNER);
    }
}
