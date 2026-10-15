package dev.ulloasp.mlsuite.schema.application.dto;

import java.time.OffsetDateTime;

import dev.ulloasp.mlsuite.schema.domain.model.BookmarkApiKey;
import jakarta.annotation.Nullable;

/** A key as members see it: never its secret, only the secret's first characters. */
public record BookmarkApiKeyDto(
        Long id,
        String name,
        String prefix,
        OffsetDateTime createdAt,
        @Nullable String createdByName,
        @Nullable OffsetDateTime lastUsedAt) {

    public static BookmarkApiKeyDto from(BookmarkApiKey key) {
        return new BookmarkApiKeyDto(key.getId(), key.getName(), key.getKeyPrefix(), key.getCreatedAt(),
                key.getCreatedByName(), key.getLastUsedAt());
    }
}
