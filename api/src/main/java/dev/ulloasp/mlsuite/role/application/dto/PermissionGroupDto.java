package dev.ulloasp.mlsuite.role.application.dto;

import java.util.List;

public record PermissionGroupDto(String name, List<PermissionDto> permissions) {
}
