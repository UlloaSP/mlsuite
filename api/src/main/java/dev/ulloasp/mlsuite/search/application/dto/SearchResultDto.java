package dev.ulloasp.mlsuite.search.application.dto;

import jakarta.annotation.Nullable;

public record SearchResultDto(
        String type,
        String id,
        String title,
        @Nullable String subtitle,
        String href,
        @Nullable Long organizationId,
        @Nullable Long modelId) {
}
