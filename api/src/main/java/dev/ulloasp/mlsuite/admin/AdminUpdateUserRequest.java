package dev.ulloasp.mlsuite.admin;

import jakarta.annotation.Nullable;
import jakarta.validation.constraints.Size;

public record AdminUpdateUserRequest(
        @Size(max = 150) @Nullable String fullName,
        @Size(max = 50) @Nullable String username,
        @Nullable String systemRole,
        @Nullable Boolean enabled) {
}
