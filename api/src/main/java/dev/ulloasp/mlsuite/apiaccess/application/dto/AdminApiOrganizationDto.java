package dev.ulloasp.mlsuite.apiaccess.application.dto;

import jakarta.annotation.Nullable;

/**
 * An organization with API clients, for the platform: its succeeded calls this calendar month
 * against its limit, which is the instance default unless {@code customLimit}.
 */
public record AdminApiOrganizationDto(
        Long organizationId,
        String name,
        @Nullable String logoUrl,
        long clientCount,
        long monthCalls,
        int monthlyLimit,
        boolean customLimit) {
}
