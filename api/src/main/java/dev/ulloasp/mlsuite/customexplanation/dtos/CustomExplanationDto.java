package dev.ulloasp.mlsuite.customexplanation.dtos;

import java.time.OffsetDateTime;

public record CustomExplanationDto(
        String id,
        String fileName,
        String contentType,
        long sizeBytes,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        boolean active,
        String source) {
}
