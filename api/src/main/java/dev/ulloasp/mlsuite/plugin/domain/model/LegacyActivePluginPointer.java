package dev.ulloasp.mlsuite.plugin.domain.model;

import java.time.OffsetDateTime;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record LegacyActivePluginPointer(String id, OffsetDateTime updatedAt) {
}

