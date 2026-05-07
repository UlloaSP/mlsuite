package dev.ulloasp.mlsuite.admin.infrastructure;

import jakarta.validation.constraints.NotBlank;

public record ServiceActionRequest(@NotBlank String action) {
}
