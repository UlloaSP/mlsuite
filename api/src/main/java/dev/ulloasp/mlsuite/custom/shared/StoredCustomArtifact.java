package dev.ulloasp.mlsuite.custom.shared;

import java.time.OffsetDateTime;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record StoredCustomArtifact(
        String id,
        String fileName,
        String contentType,
        long sizeBytes,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        String source) {
}
