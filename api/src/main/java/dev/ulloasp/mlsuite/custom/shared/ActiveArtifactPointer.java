package dev.ulloasp.mlsuite.custom.shared;

import java.time.OffsetDateTime;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record ActiveArtifactPointer(String id, OffsetDateTime updatedAt) {
}
