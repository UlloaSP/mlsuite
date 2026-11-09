package dev.ulloasp.mlsuite.admin.infrastructure;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.NotBlank;

/** What to do to a managed service: the actions the ops agent knows. */
public record ServiceActionRequest(
        @NotBlank @Pattern(regexp = "START|STOP|RESTART", message = "must be START, STOP or RESTART") String action) {
}
