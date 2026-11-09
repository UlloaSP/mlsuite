package dev.ulloasp.mlsuite.invitation.application.dto;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

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
        /** When an open (pending or expired) invitation lapses; none once it is accepted, declined or revoked. */
        @Nullable OffsetDateTime expiresAt,
        OffsetDateTime createdAt,
        /** Who sent it. */
        String createdByName) {

    public static InvitationDto from(Invitation invitation) {
        InvitationStatus status = invitation.statusAt(OffsetDateTime.now(ZoneOffset.UTC));
        boolean open = status == InvitationStatus.PENDING || status == InvitationStatus.EXPIRED;
        return new InvitationDto(
                invitation.getId(),
                invitation.getOrganization().getId(),
                invitation.getOrganization().getName(),
                invitation.getEmail(),
                RoleSummaryDto.from(invitation.getRoleDefinition()),
                status,
                open ? invitation.getExpiresAt() : null,
                invitation.getCreatedAt(),
                invitation.getCreatedBy().label());
    }
}
