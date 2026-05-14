package dev.ulloasp.mlsuite.invitation.application.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record CreateInvitationRequest(
        @Email @NotBlank String email,
        String role,
        Long roleDefinitionId,
        Long teamId) {
}
