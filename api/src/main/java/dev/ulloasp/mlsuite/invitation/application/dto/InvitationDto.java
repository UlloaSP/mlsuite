package dev.ulloasp.mlsuite.invitation.application.dto;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

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
        OffsetDateTime createdAt,
        /** Who sent it. */
        String createdByName) {

    public static InvitationDto from(Invitation invitation) {
        return new InvitationDto(
                invitation.getId(),
                invitation.getOrganization().getId(),
                invitation.getOrganization().getName(),
                invitation.getEmail(),
                RoleSummaryDto.from(invitation.getRoleDefinition()),
                invitation.statusAt(OffsetDateTime.now(ZoneOffset.UTC)),
                invitation.getExpiresAt(),
                invitation.getCreatedAt(),
                invitation.getCreatedBy().label());
    }
}
