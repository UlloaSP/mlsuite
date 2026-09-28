package dev.ulloasp.mlsuite.admin;

import java.time.OffsetDateTime;

import dev.ulloasp.mlsuite.user.domain.model.SystemRole;
import dev.ulloasp.mlsuite.user.domain.model.User;

import jakarta.annotation.Nullable;

public record AdminUserDto(
        Long id,
        String username,
        String email,
        String fullName,
        @Nullable String avatarUrl,
        SystemRole systemRole,
        boolean enabled,
        OffsetDateTime createdAt) {

    public static AdminUserDto from(User user) {
        return new AdminUserDto(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getFullName(),
                user.getAvatarUrl(),
                user.getSystemRole(),
                user.isEnabled(),
                user.getCreatedAt());
    }
}
