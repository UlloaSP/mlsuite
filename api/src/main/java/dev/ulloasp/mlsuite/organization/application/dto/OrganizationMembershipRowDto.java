package dev.ulloasp.mlsuite.organization.application.dto;

import java.time.OffsetDateTime;

import dev.ulloasp.mlsuite.organization.domain.model.MembershipStatus;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationMembership;
import dev.ulloasp.mlsuite.role.application.dto.RoleSummaryDto;
import dev.ulloasp.mlsuite.user.application.dto.UserAvatarUrl;
import dev.ulloasp.mlsuite.workspace.application.dto.MembershipActionsDto;

import jakarta.annotation.Nullable;

public record OrganizationMembershipRowDto(
        Long id,
        Long organizationId,
        Long userId,
        String fullName,
        String email,
        @Nullable String avatarUrl,
        /** The handle of their profile, while anyone may read it. */
        @Nullable String profileHandle,
        RoleSummaryDto role,
        MembershipStatus status,
        OffsetDateTime createdAt,
        MembershipActionsDto actions) {

    public static OrganizationMembershipRowDto from(OrganizationMembership membership, MembershipActionsDto actions) {
        return new OrganizationMembershipRowDto(
                membership.getId(),
                membership.getOrganization().getId(),
                membership.getUser().getId(),
                membership.getUser().getFullName(),
                membership.getUser().getEmail(),
                UserAvatarUrl.of(membership.getUser()),
                membership.getUser().visibleHandle(),
                RoleSummaryDto.from(membership.getRoleDefinition()),
                membership.getStatus(),
                membership.getCreatedAt(),
                actions);
    }
}
