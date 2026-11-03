package dev.ulloasp.mlsuite.user.application.dto;

import java.util.List;

import dev.ulloasp.mlsuite.user.domain.model.User;
import jakarta.annotation.Nullable;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * What a person changes about themselves. A field left out stays as it is; a blank text clears it,
 * as an empty list clears the links. Only the display name cannot be cleared.
 */
public record UpdateUserProfileRequest(
        @Size(max = 150) @Nullable String fullName,
        @Nullable String handle,
        @Size(max = User.BIO_MAX_LENGTH) @Nullable String bio,
        @Size(max = User.FACT_MAX_LENGTH) @Nullable String location,
        @Size(max = User.URL_MAX_LENGTH) @Nullable String website,
        @Size(max = User.FACT_MAX_LENGTH) @Nullable String company,
        @Size(max = User.MAX_PROFILE_LINKS) @Nullable List<@NotNull @Size(max = User.URL_MAX_LENGTH) String> links,
        @Nullable Boolean profilePublic,
        @Nullable Boolean profileShowsOrganizations) {
}
