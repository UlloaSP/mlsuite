package dev.ulloasp.mlsuite.team.application.dto;

import java.time.OffsetDateTime;

import dev.ulloasp.mlsuite.role.application.dto.RoleSummaryDto;
import dev.ulloasp.mlsuite.role.domain.model.RoleScope;
import dev.ulloasp.mlsuite.team.domain.model.TeamMembership;
import dev.ulloasp.mlsuite.workspace.application.dto.MembershipActionsDto;

public record TeamMembershipRowDto(
        Long id,
        Long teamId,
        Long userId,
        String fullName,
        String email,
        String avatarUrl,
        RoleSummaryDto role,
        String legacyRole,
        String status,
        OffsetDateTime createdAt,
        MembershipActionsDto actions) {

    public static TeamMembershipRowDto from(TeamMembership membership, MembershipActionsDto actions) {
        return new TeamMembershipRowDto(
                membership.getId(),
                membership.getTeam().getId(),
                membership.getUser().getId(),
                membership.getUser().getFullName(),
                membership.getUser().getEmail(),
                membership.getUser().getAvatarUrl(),
                membership.getRoleDefinition() == null
                        ? RoleSummaryDto.legacy(membership.getRole().name(), RoleScope.TEAM)
                        : RoleSummaryDto.from(membership.getRoleDefinition()),
                membership.getRole().name(),
                membership.getStatus().name(),
                membership.getCreatedAt(),
                actions);
    }
}
