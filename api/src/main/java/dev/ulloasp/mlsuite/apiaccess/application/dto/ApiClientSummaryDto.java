package dev.ulloasp.mlsuite.apiaccess.application.dto;

import java.time.OffsetDateTime;

import dev.ulloasp.mlsuite.apiaccess.domain.model.ApiClient;
import dev.ulloasp.mlsuite.apiaccess.domain.model.ApiClientStatus;
import jakarta.annotation.Nullable;

/**
 * A client in its organization's catalog. {@code lastUsedAt} is the latest call any of its keys
 * made; a suspended client carries the platform's reason.
 */
public record ApiClientSummaryDto(
        Long id,
        String name,
        @Nullable String description,
        ApiClientStatus status,
        @Nullable String suspensionReason,
        @Nullable OffsetDateTime suspendedAt,
        long keyCount,
        long bookmarkCount,
        @Nullable OffsetDateTime lastUsedAt,
        @Nullable String createdByName,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt) {

    public static ApiClientSummaryDto from(ApiClient client, long keyCount, long bookmarkCount,
            OffsetDateTime lastUsedAt) {
        return new ApiClientSummaryDto(client.getId(), client.getName(), client.getDescription(), client.getStatus(),
                client.getSuspensionReason(), client.getSuspendedAt(), keyCount, bookmarkCount, lastUsedAt,
                client.getCreatedByName(), client.getCreatedAt(), client.getUpdatedAt());
    }
}
