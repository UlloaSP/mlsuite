package dev.ulloasp.mlsuite.apiaccess.application.dto;

import dev.ulloasp.mlsuite.organization.domain.model.OrganizationKind;
import jakarta.annotation.Nullable;

/**
 * An account with API clients, a personal one or an organization, for the platform: its succeeded
 * calls this calendar month against its limit, which is the instance default unless
 * {@code customLimit}.
 */
public record AdminApiOrganizationDto(
        Long organizationId,
        String name,
        @Nullable String logoUrl,
        OrganizationKind kind,
        long clientCount,
        long monthCalls,
        int monthlyLimit,
        boolean customLimit) {
}
