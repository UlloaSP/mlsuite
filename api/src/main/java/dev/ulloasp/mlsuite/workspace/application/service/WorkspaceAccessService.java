package dev.ulloasp.mlsuite.workspace.application.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationMembershipRepository;
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationRepository;
import dev.ulloasp.mlsuite.organization.domain.exception.OrganizationAccessDeniedException;
import dev.ulloasp.mlsuite.organization.domain.exception.OrganizationNotFoundException;
import dev.ulloasp.mlsuite.organization.domain.exception.OrganizationPurgingException;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationMembership;
import dev.ulloasp.mlsuite.organization.domain.model.MembershipStatus;
import dev.ulloasp.mlsuite.user.application.service.UserLookupService;
import dev.ulloasp.mlsuite.user.domain.model.SystemRole;
import dev.ulloasp.mlsuite.user.domain.model.User;
import lombok.RequiredArgsConstructor;

/**
 * Who a request's user is and which organization the request acts in, the one rule every
 * workspace service resolves its organization through.
 */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class WorkspaceAccessService {

    /**
     * Names the organization a request acts in. The browser sends its tab's organization on every
     * request, so two tabs on two organizations each read and write their own.
     */
    public static final String ORGANIZATION_HEADER = "X-MLSuite-Organization";

    private final UserLookupService userLookupService;
    private final OrganizationRepository organizationRepository;
    private final OrganizationMembershipRepository membershipRepository;

    public User requireUser(Long userId) {
        return userLookupService.requireById(userId);
    }

    /**
     * The organization the request acts in: the one it names in {@value #ORGANIZATION_HEADER},
     * which the user must belong to (any, for a superadmin), checked on every request; without
     * the header, the one the user last selected, or their personal account once there is none
     * they can still act in, or that is being deleted. So every user always has a current
     * organization.
     */
    public Organization requireCurrentOrganization(Long userId) {
        Long requested = requestedOrganizationId();
        return requested == null
                ? selectedOrPersonal(requireUser(userId))
                : requireMembership(userId, requested).getOrganization();
    }

    private Organization selectedOrPersonal(User user) {
        Organization selected = user.getCurrentOrganization();
        if (selected != null && selected.getPurgingAt() == null && (isSuperadmin(user)
                || membershipRepository.findActiveByOrganizationIdAndUserId(selected.getId(), user.getId()).isPresent())) {
            return selected;
        }
        return organizationRepository.findByOwnerUserId(user.getId()).orElseThrow();
    }

    private static Long requestedOrganizationId() {
        if (!(RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attributes)) return null;
        String value = attributes.getRequest().getHeader(ORGANIZATION_HEADER);
        if (value == null || value.isBlank()) return null;
        try {
            return Long.valueOf(value.strip());
        } catch (NumberFormatException malformed) {
            throw new IllegalArgumentException(ORGANIZATION_HEADER + " must be an organization id.");
        }
    }

    /** A refusal leaves the caller's transaction alone, so one who asks and catches it can go on and commit. */
    @Transactional(readOnly = true, noRollbackFor = OrganizationAccessDeniedException.class)
    public OrganizationMembership requireMembership(Long userId, Long organizationId) {
        User user = requireUser(userId);
        Organization organization = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new OrganizationNotFoundException(organizationId));
        if (organization.getPurgingAt() != null) {
            throw new OrganizationPurgingException(organizationId, organization.getName());
        }
        if (isSuperadmin(user)) {
            // Superadmins act without a stored membership; callers authorize them before reading its role.
            return new OrganizationMembership(organization, user, null, MembershipStatus.ACTIVE);
        }
        return membershipRepository.findActiveByOrganizationIdAndUserId(organizationId, userId)
                .orElseThrow(() -> new OrganizationAccessDeniedException(organizationId));
    }

    /** Nobody acts in an organization being purged, superadmins included. */
    public void requireNotPurging(Long organizationId) {
        organizationRepository.findById(organizationId).filter(organization -> organization.getPurgingAt() != null)
                .ifPresent(organization -> {
                    throw new OrganizationPurgingException(organizationId, organization.getName());
                });
    }

    public boolean isSuperadmin(Long userId) {
        return isSuperadmin(userLookupService.requireById(userId));
    }

    private boolean isSuperadmin(User user) {
        return user.getSystemRole() == SystemRole.SUPERADMIN;
    }
}
