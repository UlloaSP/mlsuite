package dev.ulloasp.mlsuite.invitation.application.dto;

import java.time.OffsetDateTime;

import dev.ulloasp.mlsuite.invitation.domain.model.Invitation;
import dev.ulloasp.mlsuite.invitation.domain.model.InvitationStatus;
import dev.ulloasp.mlsuite.role.application.dto.RoleSummaryDto;

public record InvitationDto(
        Long id,
        Long organizationId,
        String organizationName,
        String email,
        RoleSummaryDto roleDefinition,
        InvitationStatus status,
        OffsetDateTime expiresAt,
        OffsetDateTime createdAt) {

    public static InvitationDto from(Invitation invitation) {
        return new InvitationDto(
                invitation.getId(),
                invitation.getOrganization().getId(),
                invitation.getOrganization().getName(),
                invitation.getEmail(),
                RoleSummaryDto.from(invitation.getRoleDefinition()),
                invitation.getStatus(),
                invitation.getExpiresAt(),
                invitation.getCreatedAt());
    }
}
