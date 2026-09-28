package dev.ulloasp.mlsuite.organization.application.dto;

import java.time.OffsetDateTime;

import dev.ulloasp.mlsuite.organization.domain.model.MembershipStatus;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationMembership;
import dev.ulloasp.mlsuite.role.application.dto.RoleSummaryDto;

import jakarta.annotation.Nullable;

public record OrganizationMembershipDto(
        @Nullable Long id,
        Long organizationId,
        Long userId,
        String fullName,
        String email,
        @Nullable String avatarUrl,
        RoleSummaryDto roleDefinition,
        MembershipStatus status,
        @Nullable OffsetDateTime createdAt) {

    public static OrganizationMembershipDto from(OrganizationMembership membership) {
        return new OrganizationMembershipDto(
                membership.getId(),
                membership.getOrganization().getId(),
                membership.getUser().getId(),
                membership.getUser().getFullName(),
                membership.getUser().getEmail(),
                membership.getUser().getAvatarUrl(),
                RoleSummaryDto.from(membership.getRoleDefinition()),
                membership.getStatus(),
                membership.getCreatedAt());
    }
}
