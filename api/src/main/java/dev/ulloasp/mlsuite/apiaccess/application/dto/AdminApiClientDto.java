package dev.ulloasp.mlsuite.apiaccess.application.dto;

import java.time.OffsetDateTime;

import dev.ulloasp.mlsuite.apiaccess.domain.model.ApiClientStatus;
import jakarta.annotation.Nullable;

/** A client of any organization, for the platform: its calls of the last 7 days, never their content. */
public record AdminApiClientDto(
        Long id,
        String name,
        ApiClientStatus status,
        @Nullable String suspensionReason,
        @Nullable OffsetDateTime suspendedAt,
        Long organizationId,
        String organizationName,
        @Nullable String organizationLogoUrl,
        long keyCount,
        @Nullable OffsetDateTime lastUsedAt,
        long weekCalls,
        long weekErrors) {
}
