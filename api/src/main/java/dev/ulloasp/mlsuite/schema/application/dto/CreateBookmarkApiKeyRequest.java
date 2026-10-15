package dev.ulloasp.mlsuite.schema.application.dto;

import jakarta.validation.constraints.NotBlank;

/** {@code name} names the consumer the key is for: at most 80 characters once trimmed. */
public record CreateBookmarkApiKeyRequest(@NotBlank String name) {
}
