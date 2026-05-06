package dev.ulloasp.mlsuite.role.application.dto;

import java.util.List;

public record RoleTemplateDto(
        Long id,
        String name,
        String description,
        String category,
        String scope,
        List<String> permissionKeys) {
}
