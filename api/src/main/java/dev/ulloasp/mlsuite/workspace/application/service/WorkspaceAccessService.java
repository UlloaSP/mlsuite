package dev.ulloasp.mlsuite.workspace.application.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationMembershipRepository;
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationRepository;
import dev.ulloasp.mlsuite.organization.domain.exception.OrganizationAccessDeniedException;
import dev.ulloasp.mlsuite.organization.domain.exception.OrganizationNotFoundException;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationMembership;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationRole;
import dev.ulloasp.mlsuite.team.adapter.out.persistence.repository.TeamRepository;
import dev.ulloasp.mlsuite.team.domain.exception.TeamNotFoundException;
import dev.ulloasp.mlsuite.team.domain.model.Team;
import dev.ulloasp.mlsuite.user.application.service.UserLookupService;
import dev.ulloasp.mlsuite.user.domain.model.SystemRole;
import dev.ulloasp.mlsuite.user.domain.model.User;

@Service
@Transactional(readOnly = true)
public class WorkspaceAccessService {

    private final UserLookupService userLookupService;
    private final WorkspaceBootstrapService workspaceBootstrapService;
    private final OrganizationRepository organizationRepository;
    private final OrganizationMembershipRepository membershipRepository;
    private final TeamRepository teamRepository;

    public WorkspaceAccessService(
            UserLookupService userLookupService,
            WorkspaceBootstrapService workspaceBootstrapService,
            OrganizationRepository organizationRepository,
            OrganizationMembershipRepository membershipRepository,
            TeamRepository teamRepository) {
        this.userLookupService = userLookupService;
        this.workspaceBootstrapService = workspaceBootstrapService;
        this.organizationRepository = organizationRepository;
        this.membershipRepository = membershipRepository;
        this.teamRepository = teamRepository;
    }

    public User requireUser(Long userId) {
        User user = userLookupService.requireById(userId);
        workspaceBootstrapService.ensureCurrentOrganization(user);
        return user;
    }

    public Organization requireCurrentOrganization(Long userId) {
        return workspaceBootstrapService.ensureCurrentOrganization(requireUser(userId));
    }

    public OrganizationMembership requireMembership(Long userId, Long organizationId) {
        User user = requireUser(userId);
        Organization organization = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new OrganizationNotFoundException(organizationId));
        if (isSuperadmin(user)) {
            return new OrganizationMembership(organization, user, OrganizationRole.OWNER, dev.ulloasp.mlsuite.organization.domain.model.MembershipStatus.ACTIVE);
        }
        return membershipRepository.findByOrganizationIdAndUserId(organizationId, userId)
                .orElseThrow(() -> new OrganizationAccessDeniedException(organizationId));
    }

    public Organization requireAdminOrganization(Long userId, Long organizationId) {
        User user = requireUser(userId);
        if (isSuperadmin(user)) {
            return organizationRepository.findById(organizationId)
                    .orElseThrow(() -> new OrganizationNotFoundException(organizationId));
        }
        OrganizationMembership membership = requireMembership(userId, organizationId);
        if (membership.getRole() != OrganizationRole.OWNER && membership.getRole() != OrganizationRole.ADMIN) {
            throw new OrganizationAccessDeniedException(organizationId);
        }
        return membership.getOrganization();
    }

    public Organization requireOwnerOrganization(Long userId, Long organizationId) {
        User user = requireUser(userId);
        if (isSuperadmin(user)) {
            return organizationRepository.findById(organizationId)
                    .orElseThrow(() -> new OrganizationNotFoundException(organizationId));
        }
        OrganizationMembership membership = requireMembership(userId, organizationId);
        if (membership.getRole() != OrganizationRole.OWNER) {
            throw new OrganizationAccessDeniedException(organizationId);
        }
        return membership.getOrganization();
    }

    public Team requireTeamInAccessibleOrganization(Long userId, Long teamId) {
        Team team = teamRepository.findById(teamId).orElseThrow(() -> new TeamNotFoundException(teamId));
        requireMembership(userId, team.getOrganization().getId());
        return team;
    }

    public boolean isSuperadmin(Long userId) {
        return isSuperadmin(userLookupService.requireById(userId));
    }

    private boolean isSuperadmin(User user) {
        return user.getSystemRole() == SystemRole.SUPERADMIN;
    }
}
