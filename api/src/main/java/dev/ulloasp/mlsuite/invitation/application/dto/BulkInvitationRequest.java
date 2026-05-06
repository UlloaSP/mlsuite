package dev.ulloasp.mlsuite.invitation.application.dto;

import java.util.List;

import jakarta.validation.constraints.NotEmpty;

public record BulkInvitationRequest(@NotEmpty List<Long> invitationIds) {
}
