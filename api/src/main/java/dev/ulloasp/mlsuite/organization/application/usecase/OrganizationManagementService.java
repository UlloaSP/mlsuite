package dev.ulloasp.mlsuite.organization.application.usecase;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.ulloasp.mlsuite.invitation.adapter.out.persistence.repository.InvitationRepository;
import dev.ulloasp.mlsuite.invitation.domain.model.InvitationStatus;
import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.ModelRepository;
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationMembershipRepository;
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationRepository;
import dev.ulloasp.mlsuite.organization.application.dto.OrganizationAdminDashboardDto;
import dev.ulloasp.mlsuite.organization.application.dto.OrganizationAdminStatsDto;
import dev.ulloasp.mlsuite.organization.application.dto.CreateOrganizationRequest;
import dev.ulloasp.mlsuite.organization.application.dto.OrganizationDto;
import dev.ulloasp.mlsuite.organization.application.dto.OrganizationMembershipDto;
import dev.ulloasp.mlsuite.organization.application.dto.OrganizationMembershipRowDto;
import dev.ulloasp.mlsuite.organization.application.dto.TransferOrganizationOwnershipRequest;
import dev.ulloasp.mlsuite.organization.application.dto.UpdateOrganizationMembershipRoleRequest;
import dev.ulloasp.mlsuite.organization.application.dto.UpdateOrganizationRequest;
import dev.ulloasp.mlsuite.organization.application.port.in.OrganizationManagementUseCase;
import dev.ulloasp.mlsuite.organization.domain.exception.OrganizationAlreadyExistsException;
import dev.ulloasp.mlsuite.organization.domain.exception.OrganizationNotFoundException;
import dev.ulloasp.mlsuite.organization.domain.model.MembershipStatus;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationMembership;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationRole;
import dev.ulloasp.mlsuite.role.adapter.out.persistence.repository.RoleDefinitionRepository;
import dev.ulloasp.mlsuite.role.application.service.RoleSeedService;
import dev.ulloasp.mlsuite.role.domain.model.OrganizationSystemRole;
import dev.ulloasp.mlsuite.role.domain.model.RoleDefinition;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.team.adapter.out.persistence.repository.TeamMembershipRepository;
import dev.ulloasp.mlsuite.team.adapter.out.persistence.repository.TeamRepository;
import dev.ulloasp.mlsuite.team.application.dto.TeamDto;
import dev.ulloasp.mlsuite.team.domain.model.TeamStatus;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;

@Service
@Transactional
public class OrganizationManagementService implements OrganizationManagementUseCase {

    private final WorkspaceAccessService workspaceAccessService;
    private final WorkspaceAuthorizationService workspaceAuthorizationService;
    private final OrganizationRepository organizationRepository;
    private final OrganizationMembershipRepository membershipRepository;
    private final TeamRepository teamRepository;
    private final TeamMembershipRepository teamMembershipRepository;
    private final ModelRepository modelRepository;
    private final InvitationRepository invitationRepository;
    private final RoleSeedService roleSeedService;
    private final RoleDefinitionRepository roleDefinitionRepository;

    public OrganizationManagementService(
            WorkspaceAccessService workspaceAccessService,
            WorkspaceAuthorizationService workspaceAuthorizationService,
            OrganizationRepository organizationRepository,
            OrganizationMembershipRepository membershipRepository,
            TeamRepository teamRepository,
            TeamMembershipRepository teamMembershipRepository,
            ModelRepository modelRepository,
            InvitationRepository invitationRepository,
            RoleSeedService roleSeedService,
            RoleDefinitionRepository roleDefinitionRepository) {
        this.workspaceAccessService = workspaceAccessService;
        this.workspaceAuthorizationService = workspaceAuthorizationService;
        this.organizationRepository = organizationRepository;
        this.membershipRepository = membershipRepository;
        this.teamRepository = teamRepository;
        this.teamMembershipRepository = teamMembershipRepository;
        this.modelRepository = modelRepository;
        this.invitationRepository = invitationRepository;
        this.roleSeedService = roleSeedService;
        this.roleDefinitionRepository = roleDefinitionRepository;
    }

    @Override
    public List<OrganizationDto> listOrganizations(Long userId) {
        workspaceAccessService.requireUser(userId);
        if (workspaceAccessService.isSuperadmin(userId)) {
            return organizationRepository.findAll().stream().map(OrganizationDto::from).toList();
        }
        return membershipRepository.findActiveByUserId(userId).stream()
                .map(OrganizationMembership::getOrganization)
                .map(OrganizationDto::from)
                .toList();
    }

    @Override
    public OrganizationDto createOrganization(Long userId, CreateOrganizationRequest request) {
        User user = workspaceAccessService.requireUser(userId);
        String slug = normalizeSlug(request.slug(), request.name());
        if (organizationRepository.existsBySlug(slug)) {
            throw new OrganizationAlreadyExistsException(slug);
        }
        Organization organization = organizationRepository.save(new Organization(
                slug,
                request.name().strip(),
                request.description(),
                user.getAvatarUrl(),
                user));
        roleSeedService.ensureOrganizationRoles(organization);
        OrganizationMembership membership = new OrganizationMembership(organization, user, OrganizationRole.OWNER, MembershipStatus.ACTIVE);
        membership.setRoleDefinition(roleSeedService.orgRole(organization, OrganizationRole.OWNER));
        membershipRepository.save(membership);
        user.setCurrentOrganization(organization);
        return OrganizationDto.from(organization);
    }

    @Override
    public OrganizationDto getOrganization(Long userId, Long organizationId) {
        workspaceAuthorizationService.requireOrganizationRead(userId, organizationId);
        return OrganizationDto.from(organizationRepository.findById(organizationId)
                .orElseThrow(() -> new OrganizationNotFoundException(organizationId)));
    }

    @Override
    public OrganizationAdminDashboardDto getAdminDashboard(Long userId, Long organizationId) {
        workspaceAuthorizationService.requireOrganizationRead(userId, organizationId);
        var org = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new OrganizationNotFoundException(organizationId));
        var stats = new OrganizationAdminStatsDto(
                teamRepository.countByOrganizationId(organizationId),
                teamRepository.countByOrganizationIdAndStatus(organizationId, TeamStatus.ACTIVE),
                membershipRepository.countByOrganizationIdAndStatus(organizationId, MembershipStatus.ACTIVE),
                modelRepository.countByOrganizationId(organizationId),
                invitationRepository.countByOrganizationIdAndStatus(organizationId, InvitationStatus.PENDING),
                0,
                0);
        var teams = teamRepository.findByOrganizationIdOrderByNameAsc(organizationId).stream()
                .limit(5)
                .map(team -> TeamDto.from(
                        team,
                        teamMembershipRepository.countByTeamIdAndStatus(team.getId(), MembershipStatus.ACTIVE),
                        modelRepository.countByTeamId(team.getId()),
                        0))
                .toList();
        return new OrganizationAdminDashboardDto(
                OrganizationDto.from(org),
                workspaceAuthorizationService.workspacePermissions(userId, organizationId),
                stats,
                teams,
                listMembers(userId, organizationId).stream().limit(5).toList(),
                invitationRepository.findByOrganizationIdOrderByCreatedAtDesc(organizationId).stream()
                        .limit(5)
                        .map(dev.ulloasp.mlsuite.invitation.application.dto.InvitationDto::from)
                        .toList());
    }

    @Override
    public OrganizationDto updateOrganization(Long userId, Long organizationId, UpdateOrganizationRequest request) {
        workspaceAuthorizationService.requireOrganizationEdit(userId, organizationId);
        Organization organization = workspaceAccessService.requireMembership(userId, organizationId).getOrganization();
        organization.setName(request.name().strip());
        organization.setDescription(request.description());
        return OrganizationDto.from(organizationRepository.save(organization));
    }

    @Override
    public void deleteOrganization(Long userId, Long organizationId) {
        workspaceAuthorizationService.requireOrganizationDelete(userId, organizationId);
        Organization organization = workspaceAccessService.requireMembership(userId, organizationId).getOrganization();
        organizationRepository.delete(organization);
    }

    @Override
    public List<OrganizationMembershipRowDto> listMembers(Long userId, Long organizationId) {
        workspaceAuthorizationService.requireOrganizationMemberView(userId, organizationId);
        roleSeedService.ensureOrganizationRoles(organizationRepository.findById(organizationId)
                .orElseThrow(() -> new dev.ulloasp.mlsuite.organization.domain.exception.OrganizationNotFoundException(organizationId)));
        return membershipRepository.findByOrganizationIdAndStatusOrderByCreatedAtAsc(organizationId, MembershipStatus.ACTIVE)
                .stream()
                .map(membership -> OrganizationMembershipRowDto.from(
                        membership,
                        workspaceAuthorizationService.organizationMemberActions(userId, organizationId, membership)))
                .toList();
    }

    @Override
    public OrganizationMembershipDto updateMemberRole(
            Long userId,
            Long organizationId,
            Long membershipId,
            UpdateOrganizationMembershipRoleRequest request) {
        workspaceAuthorizationService.requireOrganizationMemberView(userId, organizationId);
        OrganizationMembership membership = membershipRepository.findById(membershipId)
                .orElseThrow(() -> new IllegalArgumentException("Membership does not exist."));
        if (!membership.getOrganization().getId().equals(organizationId)) {
            throw new IllegalArgumentException("Membership does not belong to organization.");
        }
        var actions = workspaceAuthorizationService.organizationMemberActions(userId, organizationId, membership);
        Long nextRoleId = request.roleDefinitionId();
        boolean assignable = actions.assignableRoles().stream().anyMatch(role -> role.id().equals(nextRoleId));
        if (!actions.canChangeRole() || !assignable) {
            throw new IllegalArgumentException("Membership role cannot be changed.");
        }
        RoleDefinition nextRole = roleDefinitionRepository.findByIdAndOrganizationId(nextRoleId, organizationId)
                .orElseThrow(() -> new IllegalArgumentException("Role does not exist."));
        membership.setRoleDefinition(nextRole);
        membership.setRole(legacyRole(nextRole));
        return OrganizationMembershipDto.from(membershipRepository.save(membership));
    }

    @Override
    public void removeMember(Long userId, Long organizationId, Long membershipId) {
        workspaceAuthorizationService.requireOrganizationMemberView(userId, organizationId);
        OrganizationMembership membership = membershipRepository.findById(membershipId)
                .orElseThrow(() -> new IllegalArgumentException("Membership does not exist."));
        if (!membership.getOrganization().getId().equals(organizationId)) {
            throw new IllegalArgumentException("Membership does not belong to organization.");
        }
        if (!workspaceAuthorizationService.organizationMemberActions(userId, organizationId, membership).canRemove()
                || membership.getRole() == OrganizationRole.OWNER) {
            throw new IllegalArgumentException("Cannot remove organization owner.");
        }
        membership.setStatus(MembershipStatus.REMOVED);
        membershipRepository.save(membership);
    }

    @Override
    public OrganizationMembershipDto transferOwnership(
            Long userId,
            Long organizationId,
            TransferOrganizationOwnershipRequest request) {
        workspaceAuthorizationService.requireOwnershipTransfer(userId, organizationId);
        OrganizationMembership nextOwner = membershipRepository.findById(request.nextOwnerMembershipId())
                .orElseThrow(() -> new IllegalArgumentException("Membership does not exist."));
        if (!nextOwner.getOrganization().getId().equals(organizationId) || nextOwner.getStatus() != MembershipStatus.ACTIVE) {
            throw new IllegalArgumentException("Target membership is invalid.");
        }
        OrganizationMembership currentOwner = membershipRepository
                .findByOrganizationIdAndStatusOrderByCreatedAtAsc(organizationId, MembershipStatus.ACTIVE)
                .stream()
                .filter(membership -> membership.getRole() == OrganizationRole.OWNER)
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Organization owner does not exist."));
        if (currentOwner.getId().equals(nextOwner.getId())) {
            return OrganizationMembershipDto.from(currentOwner);
        }
        currentOwner.setRole(OrganizationRole.ADMIN);
        nextOwner.setRole(OrganizationRole.OWNER);
        roleSeedService.ensureOrganizationRoles(nextOwner.getOrganization());
        currentOwner.setRoleDefinition(roleSeedService.orgRole(nextOwner.getOrganization(), OrganizationRole.ADMIN));
        nextOwner.setRoleDefinition(roleSeedService.orgRole(nextOwner.getOrganization(), OrganizationRole.OWNER));
        membershipRepository.save(currentOwner);
        return OrganizationMembershipDto.from(membershipRepository.save(nextOwner));
    }

    private String normalizeSlug(String rawSlug, String rawName) {
        String base = (rawSlug != null && !rawSlug.isBlank() ? rawSlug : rawName)
                .toLowerCase()
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-|-$)", "");
        return base.isBlank() ? "workspace" : base;
    }

    private OrganizationRole legacyRole(RoleDefinition roleDefinition) {
        return OrganizationSystemRole.legacyRole(roleDefinition, OrganizationRole.MEMBER);
    }
}
