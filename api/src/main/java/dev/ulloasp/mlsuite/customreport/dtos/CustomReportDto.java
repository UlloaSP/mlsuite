package dev.ulloasp.mlsuite.customreport.dtos;

import java.time.OffsetDateTime;

public record CustomReportDto(
        String id,
        String fileName,
        String contentType,
        long sizeBytes,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        boolean active,
        String source) {
}
