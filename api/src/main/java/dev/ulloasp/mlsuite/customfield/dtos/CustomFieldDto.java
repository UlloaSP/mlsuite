package dev.ulloasp.mlsuite.customfield.dtos;

import java.time.OffsetDateTime;

public record CustomFieldDto(
        String id,
        String fileName,
        String contentType,
        long sizeBytes,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        boolean active,
        String source) {
}
