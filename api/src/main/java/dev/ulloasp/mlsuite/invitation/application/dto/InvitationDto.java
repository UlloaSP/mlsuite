package dev.ulloasp.mlsuite.invitation.application.dto;

import java.time.OffsetDateTime;

import dev.ulloasp.mlsuite.invitation.domain.model.Invitation;
import dev.ulloasp.mlsuite.role.application.dto.RoleSummaryDto;

public record InvitationDto(
        Long id,
        Long organizationId,
        String organizationName,
        Long teamId,
        String email,
        String role,
        RoleSummaryDto roleDefinition,
        String status,
        String token,
        OffsetDateTime expiresAt,
        OffsetDateTime createdAt) {

    public static InvitationDto from(Invitation invitation) {
        return new InvitationDto(
                invitation.getId(),
                invitation.getOrganization().getId(),
                invitation.getOrganization().getName(),
                invitation.getTeam() != null ? invitation.getTeam().getId() : null,
                invitation.getEmail(),
                invitation.getRole().name(),
                invitation.getRoleDefinition() != null ? RoleSummaryDto.from(invitation.getRoleDefinition()) : null,
                invitation.getStatus().name(),
                invitation.getToken(),
                invitation.getExpiresAt(),
                invitation.getCreatedAt());
    }
}
