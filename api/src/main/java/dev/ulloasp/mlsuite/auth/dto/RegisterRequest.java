package dev.ulloasp.mlsuite.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank @Email String email,
        @NotBlank @Size(min = 10) String password,
        @NotBlank @Size(max = 150) String fullName,
        @NotBlank @Size(min = 3, max = 50) String username) {
}
