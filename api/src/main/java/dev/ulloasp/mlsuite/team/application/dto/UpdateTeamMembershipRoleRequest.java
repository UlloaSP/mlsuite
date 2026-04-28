package dev.ulloasp.mlsuite.team.application.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdateTeamMembershipRoleRequest(@NotBlank String role) {
}
