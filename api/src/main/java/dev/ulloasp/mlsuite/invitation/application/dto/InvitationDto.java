package dev.ulloasp.mlsuite.invitation.application.dto;

import java.time.OffsetDateTime;

import dev.ulloasp.mlsuite.invitation.domain.model.Invitation;
import dev.ulloasp.mlsuite.invitation.domain.model.InvitationStatus;
import dev.ulloasp.mlsuite.role.application.dto.RoleSummaryDto;

import jakarta.annotation.Nullable;

public record InvitationDto(
        Long id,
        Long organizationId,
        String organizationName,
        String email,
        RoleSummaryDto roleDefinition,
        InvitationStatus status,
        @Nullable String token,
        OffsetDateTime expiresAt,
        OffsetDateTime createdAt) {

    public static InvitationDto from(Invitation invitation) {
        return from(invitation, true);
    }

    public static InvitationDto from(Invitation invitation, boolean includeToken) {
        return new InvitationDto(
                invitation.getId(),
                invitation.getOrganization().getId(),
                invitation.getOrganization().getName(),
                invitation.getEmail(),
                RoleSummaryDto.from(invitation.getRoleDefinition()),
                invitation.getStatus(),
                includeToken ? invitation.getToken() : null,
                invitation.getExpiresAt(),
                invitation.getCreatedAt());
    }
}
