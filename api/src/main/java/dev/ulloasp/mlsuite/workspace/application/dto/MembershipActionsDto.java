package dev.ulloasp.mlsuite.workspace.application.dto;

import java.util.List;

import dev.ulloasp.mlsuite.role.application.dto.RoleSummaryDto;

public record MembershipActionsDto(
        boolean canChangeRole,
        boolean canRemove,
        List<RoleSummaryDto> assignableRoles) {
}
