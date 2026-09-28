package dev.ulloasp.mlsuite.organization.application.dto;

import java.time.OffsetDateTime;

import dev.ulloasp.mlsuite.organization.domain.model.OrganizationMembership;
import dev.ulloasp.mlsuite.role.application.dto.RoleSummaryDto;

public record OrganizationMembershipDto(
        Long id,
        Long organizationId,
        Long userId,
        String fullName,
        String email,
        String avatarUrl,
        RoleSummaryDto roleDefinition,
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
                RoleSummaryDto.from(membership.getRoleDefinition()),
                membership.getStatus().name(),
                membership.getCreatedAt());
    }
}
