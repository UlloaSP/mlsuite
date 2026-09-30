/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.user.application.dto;

import java.time.format.DateTimeFormatter;

import dev.ulloasp.mlsuite.user.domain.model.SystemRole;
import dev.ulloasp.mlsuite.user.domain.model.User;

import jakarta.annotation.Nullable;

public record UserDto(
        Long id,
        String userName,
        String email,
        String fullName,
        @Nullable String avatarUrl,
        SystemRole systemRole,
        boolean enabled,
        String createdAt) {

    public static final UserDto toDto(User user) {
        return new UserDto(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getFullName(),
                user.getAvatarUrl(),
                user.getSystemRole(),
                user.isEnabled(),
                user.getCreatedAt() == null
                        ? null
                        : user.getCreatedAt().format(DateTimeFormatter.ofPattern("MMM, yyyy")));
    }
}

