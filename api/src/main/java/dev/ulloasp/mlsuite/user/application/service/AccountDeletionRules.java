package dev.ulloasp.mlsuite.user.application.service;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationMembershipRepository;
import dev.ulloasp.mlsuite.organization.application.usecase.OrganizationDeletionService;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationMembership;
import dev.ulloasp.mlsuite.user.adapter.out.persistence.repository.UserRepository;
import dev.ulloasp.mlsuite.user.domain.model.SystemRole;
import dev.ulloasp.mlsuite.user.domain.model.User;
import lombok.RequiredArgsConstructor;

/**
 * Whether an account may go, whoever asks: the last superadmin stays, and so does the only owner of
 * a team that has anyone or anything in it, as a team never loses its data with a person. A team
 * only they own, with nothing in it, leaves with them.
 */
@Component
@RequiredArgsConstructor
public class AccountDeletionRules {

    private final OrganizationMembershipRepository memberships;
    private final OrganizationDeletionService organizations;
    private final UserRepository users;

    public Optional<String> refusal(User user) {
        // One already closed for deletion no longer counts among the enabled, so it is checked as they are.
        if (user.getSystemRole() == SystemRole.SUPERADMIN && user.isEnabled()
                && users.countBySystemRoleAndEnabledTrue(SystemRole.SUPERADMIN) <= 1) {
            return Optional.of("This is the last superadmin. Make another account a superadmin first.");
        }
        String kept = soleOwned(user).stream().filter(team -> !alone(user, team)).map(Organization::getName)
                .collect(Collectors.joining(", "));
        return kept.isEmpty() ? Optional.empty() : Optional.of(
                "This account is the only owner of %s. Transfer the ownership or delete the organization first."
                        .formatted(kept));
    }

    /** The teams that go with the account. */
    public List<Organization> emptyTeams(User user) {
        return soleOwned(user).stream().filter(team -> alone(user, team)).toList();
    }

    private List<Organization> soleOwned(User user) {
        return memberships.findOwnedTeams(user.getId()).stream()
                .filter(team -> memberships.findOtherActiveMembers(team.getId(), user.getId()).stream()
                        .noneMatch(OrganizationMembership::isOwner))
                .toList();
    }

    private boolean alone(User user, Organization team) {
        return memberships.findOtherActiveMembers(team.getId(), user.getId()).isEmpty()
                && !organizations.hasContent(team.getId());
    }
}
