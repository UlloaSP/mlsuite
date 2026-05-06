package dev.ulloasp.mlsuite.organization.application.dto;

import java.time.OffsetDateTime;

import dev.ulloasp.mlsuite.organization.domain.model.OrganizationMembership;
import dev.ulloasp.mlsuite.role.application.dto.RoleSummaryDto;
import dev.ulloasp.mlsuite.role.domain.model.RoleScope;
import dev.ulloasp.mlsuite.workspace.application.dto.MembershipActionsDto;

public record OrganizationMembershipRowDto(
        Long id,
        Long organizationId,
        Long userId,
        String fullName,
        String email,
        String avatarUrl,
        RoleSummaryDto role,
        String legacyRole,
        String status,
        OffsetDateTime createdAt,
        MembershipActionsDto actions) {

    public static OrganizationMembershipRowDto from(OrganizationMembership membership, MembershipActionsDto actions) {
        return new OrganizationMembershipRowDto(
                membership.getId(),
                membership.getOrganization().getId(),
                membership.getUser().getId(),
                membership.getUser().getFullName(),
                membership.getUser().getEmail(),
                membership.getUser().getAvatarUrl(),
                membership.getRoleDefinition() == null
                        ? RoleSummaryDto.legacy(membership.getRole().name(), RoleScope.ORGANIZATION)
                        : RoleSummaryDto.from(membership.getRoleDefinition()),
                membership.getRole().name(),
                membership.getStatus().name(),
                membership.getCreatedAt(),
                actions);
    }
}
