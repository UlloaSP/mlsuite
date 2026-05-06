package dev.ulloasp.mlsuite.role.application.dto;

import java.util.List;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateRoleFromTemplateRequest(
        @NotNull Long templateId,
        @Size(max = 120) String name,
        List<String> permissionKeys) {
}
