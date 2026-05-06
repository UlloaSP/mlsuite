package dev.ulloasp.mlsuite.role.application.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record DuplicateRoleRequest(@NotBlank @Size(max = 120) String name) {
}
