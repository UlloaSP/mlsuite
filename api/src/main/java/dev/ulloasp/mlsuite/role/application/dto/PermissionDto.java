package dev.ulloasp.mlsuite.role.application.dto;

import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;

public record PermissionDto(PermissionKey key, String label, String description, boolean dangerous) {
}
