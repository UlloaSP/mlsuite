package dev.ulloasp.mlsuite.workspace.application.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationMembershipRepository;
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationRepository;
import dev.ulloasp.mlsuite.organization.domain.model.Handle;
import dev.ulloasp.mlsuite.organization.domain.model.MembershipStatus;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationMembership;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationRole;
import dev.ulloasp.mlsuite.role.application.service.RoleSeedService;
import dev.ulloasp.mlsuite.user.domain.model.User;
import lombok.RequiredArgsConstructor;

/**
 * A user's personal account: their own namespace row, opened once in the transaction that creates
 * the user and named after them for as long as they exist. Nothing else creates one, so a user
 * without one is a defect, not a state to repair.
 */
@Service
@Transactional
@RequiredArgsConstructor
public class PersonalAccountService {

    private final OrganizationRepository organizationRepository;
    private final OrganizationMembershipRepository membershipRepository;
    private final RoleSeedService roleSeedService;

    /** The handle a new user takes; every user's handle is a slug, so the slugs alone say what is taken. */
    public String claimHandle(String raw) {
        return Handle.claim(raw, organizationRepository::existsBySlug);
    }

    /** Opens the account of a user just saved, who owns it from then on. */
    public void open(User user) {
        Organization personal = organizationRepository.save(Organization.personal(user));
        roleSeedService.ensureOrganizationRoles(personal);
        roleSeedService.reviewerRole(personal);
        membershipRepository.save(new OrganizationMembership(
                personal,
                user,
                roleSeedService.orgRole(personal, OrganizationRole.OWNER),
                MembershipStatus.ACTIVE));
    }

    /** Changes the user's handle, unless it is the one they already have. */
    public void renameHandle(User user, String raw) {
        if (!Handle.parse(raw).equals(user.getUsername())) {
            user.setUsername(claimHandle(raw));
        }
    }

    /** Names the account as its owner is named now. */
    public void followOwner(User user) {
        Organization personal = organizationRepository.findByOwnerUserId(user.getId()).orElseThrow();
        personal.setSlug(user.getUsername());
        personal.setName(user.getFullName());
        personal.setUpdatedBy(user);
    }
}
