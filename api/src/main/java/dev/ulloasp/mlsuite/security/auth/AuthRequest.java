package dev.ulloasp.mlsuite.security.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AuthRequest(
        @Email @NotBlank String email,
        @NotBlank @Size(min = 10, max = 128) String password,
        @Size(max = 150) String fullName,
        @Size(max = 50) String username) {
}
