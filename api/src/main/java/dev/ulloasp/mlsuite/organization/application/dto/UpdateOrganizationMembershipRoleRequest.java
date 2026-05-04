package dev.ulloasp.mlsuite.organization.application.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdateOrganizationMembershipRoleRequest(@NotBlank String role) {
}
