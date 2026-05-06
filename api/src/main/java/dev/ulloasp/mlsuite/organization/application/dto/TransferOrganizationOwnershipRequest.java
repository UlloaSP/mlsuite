package dev.ulloasp.mlsuite.organization.application.dto;

import jakarta.validation.constraints.NotNull;

public record TransferOrganizationOwnershipRequest(@NotNull Long nextOwnerMembershipId) {
}
