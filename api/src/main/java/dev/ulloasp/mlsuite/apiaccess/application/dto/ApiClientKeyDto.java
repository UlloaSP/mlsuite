package dev.ulloasp.mlsuite.apiaccess.application.dto;

import java.time.OffsetDateTime;

import dev.ulloasp.mlsuite.apiaccess.domain.model.ApiClientKey;
import jakarta.annotation.Nullable;

/** A key as members see it: never its secret, only the prefix that tells it apart. */
public record ApiClientKeyDto(
        Long id,
        String name,
        String prefix,
        @Nullable String createdByName,
        OffsetDateTime createdAt,
        @Nullable OffsetDateTime lastUsedAt) {

    public static ApiClientKeyDto from(ApiClientKey key) {
        return new ApiClientKeyDto(key.getId(), key.getName(), key.getKeyPrefix(), key.getCreatedByName(),
                key.getCreatedAt(), key.getLastUsedAt());
    }
}
