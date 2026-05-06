package dev.ulloasp.mlsuite.admin;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AdminPasswordRequest(@NotBlank @Size(min = 10, max = 128) String password) {
}
