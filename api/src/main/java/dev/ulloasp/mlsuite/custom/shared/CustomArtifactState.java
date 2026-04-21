package dev.ulloasp.mlsuite.custom.shared;

import java.time.OffsetDateTime;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record CustomArtifactState(List<String> activeIds, OffsetDateTime updatedAt) {
}
