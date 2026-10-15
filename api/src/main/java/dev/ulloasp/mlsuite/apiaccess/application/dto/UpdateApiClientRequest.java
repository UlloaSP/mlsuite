package dev.ulloasp.mlsuite.apiaccess.application.dto;

import jakarta.annotation.Nullable;

/** Renames the client and replaces its note; a blank note removes it. */
public record UpdateApiClientRequest(String name, @Nullable String description) {
}
