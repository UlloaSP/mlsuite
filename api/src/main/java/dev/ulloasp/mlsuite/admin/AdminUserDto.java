package dev.ulloasp.mlsuite.admin;

import java.time.OffsetDateTime;

import dev.ulloasp.mlsuite.user.domain.model.User;

public record AdminUserDto(
        Long id,
        String username,
        String email,
        String fullName,
        String avatarUrl,
        String systemRole,
        boolean enabled,
        OffsetDateTime createdAt) {

    public static AdminUserDto from(User user) {
        return new AdminUserDto(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getFullName(),
                user.getAvatarUrl(),
                user.getSystemRole().name(),
                user.isEnabled(),
                user.getCreatedAt());
    }
}
