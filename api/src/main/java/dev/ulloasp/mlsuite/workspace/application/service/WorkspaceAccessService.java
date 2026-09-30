package dev.ulloasp.mlsuite.workspace.application.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationMembershipRepository;
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationRepository;
import dev.ulloasp.mlsuite.organization.domain.exception.OrganizationAccessDeniedException;
import dev.ulloasp.mlsuite.organization.domain.exception.OrganizationNotFoundException;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationMembership;
import dev.ulloasp.mlsuite.organization.domain.model.MembershipStatus;
import dev.ulloasp.mlsuite.user.application.service.UserLookupService;
import dev.ulloasp.mlsuite.user.domain.model.SystemRole;
import dev.ulloasp.mlsuite.user.domain.model.User;
import lombok.RequiredArgsConstructor;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class WorkspaceAccessService {

    private final UserLookupService userLookupService;
    private final WorkspaceBootstrapService workspaceBootstrapService;
    private final OrganizationRepository organizationRepository;
    private final OrganizationMembershipRepository membershipRepository;

    public User requireUser(Long userId) {
        User user = userLookupService.requireById(userId);
        workspaceBootstrapService.ensureCurrentOrganization(user);
        return user;
    }

    public Organization requireCurrentOrganization(Long userId) {
        return requireUser(userId).getCurrentOrganization();
    }

    public OrganizationMembership requireMembership(Long userId, Long organizationId) {
        User user = requireUser(userId);
        Organization organization = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new OrganizationNotFoundException(organizationId));
        if (isSuperadmin(user)) {
            // Superadmins act without a stored membership; callers authorize them before reading its role.
            return new OrganizationMembership(organization, user, null, MembershipStatus.ACTIVE);
        }
        return membershipRepository.findActiveByOrganizationIdAndUserId(organizationId, userId)
                .orElseThrow(() -> new OrganizationAccessDeniedException(organizationId));
    }

    public boolean isSuperadmin(Long userId) {
        return isSuperadmin(userLookupService.requireById(userId));
    }

    private boolean isSuperadmin(User user) {
        return user.getSystemRole() == SystemRole.SUPERADMIN;
    }
}
