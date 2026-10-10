package dev.ulloasp.mlsuite.organization.application.dto;

import java.util.List;

/**
 * One page of an organization's members; {@code totalMembers} counts all active members.
 */
public record MemberCatalogDto(
        List<OrganizationMembershipRowDto> items,
        int page,
        int size,
        long totalItems,
        boolean hasNext,
        long totalMembers) {
}
