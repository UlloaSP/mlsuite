package dev.ulloasp.mlsuite.apiaccess.application.dto;

import java.util.List;

import dev.ulloasp.mlsuite.schema.domain.model.BookmarkVisibility;
import jakarta.annotation.Nullable;

/**
 * A bookmark as the client API sees it. {@code apiId} is the id clients call it by, assigned
 * when a client is first given it. {@code modelId} names the one model its snapshot binds;
 * {@code refusal} says why clients cannot run it now, and is null when they can.
 * {@code clientNames} are the clients that may run it.
 */
public record ApiAccessBookmarkDto(
        Long id,
        @Nullable String apiId,
        String name,
        Long schemaId,
        String schemaName,
        int version,
        @Nullable String versionName,
        BookmarkVisibility visibility,
        @Nullable Long modelId,
        @Nullable String modelName,
        @Nullable String refusal,
        List<String> clientNames) {
}
