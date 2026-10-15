package dev.ulloasp.mlsuite.apiaccess.application.dto;

import jakarta.annotation.Nullable;

/** A client's name, unique in the organization whatever its case, and an optional note. */
public record CreateApiClientRequest(String name, @Nullable String description) {
}
