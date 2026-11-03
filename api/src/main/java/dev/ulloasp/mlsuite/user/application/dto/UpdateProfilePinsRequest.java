package dev.ulloasp.mlsuite.user.application.dto;

import java.util.List;

import dev.ulloasp.mlsuite.schema.domain.model.ProfilePin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Every bookmark to keep pinned, by public id, in the order they are shown; replaces those before. */
public record UpdateProfilePinsRequest(
        @NotNull @Size(max = ProfilePin.MAX_PINS) List<@NotBlank String> publicIds) {
}
