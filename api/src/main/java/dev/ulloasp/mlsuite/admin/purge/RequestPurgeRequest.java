package dev.ulloasp.mlsuite.admin.purge;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record RequestPurgeRequest(@NotNull PurgeScope scope, @NotNull Long targetId, @NotBlank String confirmation) {
}
