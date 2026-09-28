package dev.ulloasp.mlsuite.invitation.application.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateInvitationRequest(
        @Email @NotBlank String email,
        @NotNull Long roleDefinitionId) {
}
