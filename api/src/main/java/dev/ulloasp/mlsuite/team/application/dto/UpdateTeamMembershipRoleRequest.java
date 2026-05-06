package dev.ulloasp.mlsuite.team.application.dto;

import jakarta.validation.constraints.NotNull;

public record UpdateTeamMembershipRoleRequest(@NotNull Long roleDefinitionId) {
}
