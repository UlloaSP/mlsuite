package dev.ulloasp.mlsuite.role.application.dto;

import java.util.List;

import jakarta.annotation.Nullable;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateRoleFromTemplateRequest(
        @NotNull Long templateId,
        @Size(max = 120) @Nullable String name,
        @Nullable List<String> permissionKeys) {
}
