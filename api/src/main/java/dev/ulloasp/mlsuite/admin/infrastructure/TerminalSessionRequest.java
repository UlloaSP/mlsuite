package dev.ulloasp.mlsuite.admin.infrastructure;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record TerminalSessionRequest(
        @NotBlank String serviceName,
        @Min(1) int cols,
        @Min(1) int rows) {
}
