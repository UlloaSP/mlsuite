package dev.ulloasp.mlsuite.workspace.application.dto;

import jakarta.validation.constraints.NotNull;

public record SelectOrganizationRequest(@NotNull Long organizationId) {
}
