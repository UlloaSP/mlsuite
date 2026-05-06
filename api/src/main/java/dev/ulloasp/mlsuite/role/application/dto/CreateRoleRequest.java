package dev.ulloasp.mlsuite.role.application.dto;

import java.util.List;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

public record CreateRoleRequest(
        @NotBlank @Size(max = 120) String name,
        @Size(max = 600) String description,
        @NotEmpty List<String> permissionKeys) {
}
