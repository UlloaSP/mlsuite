package dev.ulloasp.mlsuite.invitation.application.dto;

import java.time.OffsetDateTime;

import dev.ulloasp.mlsuite.invitation.domain.model.Invitation;
import dev.ulloasp.mlsuite.role.application.dto.RoleSummaryDto;

public record InvitationDto(
        Long id,
        Long organizationId,
        String organizationName,
        String email,
        String role,
        RoleSummaryDto roleDefinition,
        String status,
        String token,
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
                invitation.getRole().name(),
                invitation.getRoleDefinition() != null ? RoleSummaryDto.from(invitation.getRoleDefinition()) : null,
                invitation.getStatus().name(),
                includeToken ? invitation.getToken() : null,
                invitation.getExpiresAt(),
                invitation.getCreatedAt());
    }
}
