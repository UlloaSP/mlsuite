package dev.ulloasp.mlsuite.admin;

import jakarta.annotation.Nullable;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AdminCreateUserRequest(
        @Email @NotBlank String email,
        @NotBlank @Size(min = 10, max = 128) String password,
        @NotBlank @Size(max = 150) String fullName,
        @Size(max = 50) @Nullable String username,
        @Nullable String systemRole,
        @Nullable Boolean enabled) {
}
