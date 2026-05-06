package dev.ulloasp.mlsuite.workspace.application.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.ModelRepository;
import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationMembershipRepository;
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationRepository;
import dev.ulloasp.mlsuite.organization.domain.model.MembershipStatus;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationMembership;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationRole;
import dev.ulloasp.mlsuite.user.adapter.out.persistence.repository.UserRepository;
import dev.ulloasp.mlsuite.user.domain.model.User;

@Service
@Transactional
public class WorkspaceBootstrapService {

    private final OrganizationRepository organizationRepository;
    private final OrganizationMembershipRepository membershipRepository;
    private final UserRepository userRepository;
    private final ModelRepository modelRepository;

    public WorkspaceBootstrapService(
            OrganizationRepository organizationRepository,
            OrganizationMembershipRepository membershipRepository,
            UserRepository userRepository,
            ModelRepository modelRepository) {
        this.organizationRepository = organizationRepository;
        this.membershipRepository = membershipRepository;
        this.userRepository = userRepository;
        this.modelRepository = modelRepository;
    }

    public Organization ensureCurrentOrganization(User user) {
        if (user.getCurrentOrganization() != null) {
            backfillModels(user, user.getCurrentOrganization());
            return user.getCurrentOrganization();
        }

        List<OrganizationMembership> memberships = membershipRepository.findActiveByUserId(user.getId());
        if (!memberships.isEmpty()) {
            Organization current = memberships.get(0).getOrganization();
            user.setCurrentOrganization(current);
            userRepository.save(user);
            backfillModels(user, current);
            return current;
        }

        Organization organization = organizationRepository.save(new Organization(
                buildSlug(user),
                buildName(user),
                "Personal workspace",
                user.getAvatarUrl(),
                user));
        membershipRepository.save(new OrganizationMembership(
                organization,
                user,
                OrganizationRole.OWNER,
                MembershipStatus.ACTIVE));
        user.setCurrentOrganization(organization);
        userRepository.save(user);
        backfillModels(user, organization);
        return organization;
    }

    private void backfillModels(User user, Organization organization) {
        for (Model model : modelRepository.findByUserIdAndOrganizationIdIsNull(user.getId())) {
            model.setOrganization(organization);
            modelRepository.save(model);
        }
    }

    private String buildSlug(User user) {
        String base = (user.getUsername() + "-personal").toLowerCase().replaceAll("[^a-z0-9]+", "-");
        String slug = base.replaceAll("(^-|-$)", "");
        return organizationRepository.existsBySlug(slug) ? slug + "-" + user.getId() : slug;
    }

    private String buildName(User user) {
        String ownerName = user.getFullName() != null && !user.getFullName().isBlank()
                ? user.getFullName()
                : user.getUsername();
        return ownerName + " Personal";
    }
}
