package dev.ulloasp.mlsuite.organization.application.dto;

import java.time.OffsetDateTime;

import dev.ulloasp.mlsuite.organization.domain.model.OrganizationMembership;

public record OrganizationMembershipDto(
        Long id,
        Long organizationId,
        Long userId,
        String fullName,
        String email,
        String avatarUrl,
        String role,
        String status,
        OffsetDateTime createdAt) {

    public static OrganizationMembershipDto from(OrganizationMembership membership) {
        return new OrganizationMembershipDto(
                membership.getId(),
                membership.getOrganization().getId(),
                membership.getUser().getId(),
                membership.getUser().getFullName(),
                membership.getUser().getEmail(),
                membership.getUser().getAvatarUrl(),
                membership.getRole().name(),
                membership.getStatus().name(),
                membership.getCreatedAt());
    }
}
