package dev.ulloasp.mlsuite.organization.services;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import dev.ulloasp.mlsuite.organization.dtos.OrganizationSummaryDto;
import dev.ulloasp.mlsuite.organization.entities.OrganizationUser;
import dev.ulloasp.mlsuite.organization.entities.OrganizationUserStatus;
import dev.ulloasp.mlsuite.organization.repositories.OrganizationUserRepository;
import dev.ulloasp.mlsuite.rbac.repositories.UserRoleRepository;
import dev.ulloasp.mlsuite.security.tenant.OrganizationAccessDeniedException;
import dev.ulloasp.mlsuite.user.entity.User;

@Service
public class OrganizationAccessService {

    private final OrganizationUserRepository organizationUserRepository;
    private final UserRoleRepository userRoleRepository;
    private final OrganizationProvisioningService organizationProvisioningService;

    public OrganizationAccessService(
            OrganizationUserRepository organizationUserRepository,
            UserRoleRepository userRoleRepository,
            OrganizationProvisioningService organizationProvisioningService) {
        this.organizationUserRepository = organizationUserRepository;
        this.userRoleRepository = userRoleRepository;
        this.organizationProvisioningService = organizationProvisioningService;
    }

    public OrganizationUser requireActiveMembership(User user, String organizationSlug) {
        organizationProvisioningService.ensurePersonalOrganization(user);
        OrganizationUser membership = organizationUserRepository.findByUserIdAndOrganizationSlug(user.getId(), organizationSlug)
                .orElseThrow(() -> new OrganizationAccessDeniedException(organizationSlug));
        if (membership.getStatus() != OrganizationUserStatus.ACTIVE) {
            throw new OrganizationAccessDeniedException(organizationSlug);
        }
        return membership;
    }

    public OrganizationUser resolveActiveMembershipOrDefault(User user, String organizationSlug) {
        if (organizationSlug != null && !organizationSlug.isBlank()) {
            return requireActiveMembership(user, organizationSlug);
        }
        organizationProvisioningService.ensurePersonalOrganization(user);
        return organizationUserRepository.findByUserIdAndStatusOrderByOrganizationNameAsc(
                user.getId(),
                OrganizationUserStatus.ACTIVE).stream().findFirst()
                .orElseThrow(() -> new OrganizationAccessDeniedException("default"));
    }

    public List<OrganizationSummaryDto> listActiveOrganizations(User user) {
        List<OrganizationUser> memberships = organizationUserRepository.findByUserIdAndStatusOrderByOrganizationNameAsc(
                user.getId(),
                OrganizationUserStatus.ACTIVE);
        List<Long> organizationIds = memberships.stream().map(membership -> membership.getOrganization().getId()).toList();
        Map<Long, List<String>> roleNames = userRoleRepository.findByUserIdAndOrganizationIdIn(user.getId(), organizationIds).stream()
                .collect(Collectors.groupingBy(
                        userRole -> userRole.getOrganization().getId(),
                        Collectors.mapping(userRole -> userRole.getRole().getName(), Collectors.toList())));
        List<OrganizationSummaryDto> summaries = new ArrayList<>();
        memberships.forEach(membership -> summaries.add(new OrganizationSummaryDto(
                membership.getOrganization().getId(),
                membership.getOrganization().getName(),
                membership.getOrganization().getSlug(),
                membership.getStatus().name(),
                roleNames.getOrDefault(membership.getOrganization().getId(), List.of()).stream()
                        .distinct()
                        .sorted(Comparator.naturalOrder())
                        .toList())));
        return summaries;
    }
}
