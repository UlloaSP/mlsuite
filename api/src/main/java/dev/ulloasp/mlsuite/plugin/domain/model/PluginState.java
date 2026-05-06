package dev.ulloasp.mlsuite.plugin.domain.model;

import java.time.OffsetDateTime;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record PluginState(List<String> activeIds, OffsetDateTime updatedAt) {
}

