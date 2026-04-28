/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.user.application.dto;

import java.time.format.DateTimeFormatter;

import dev.ulloasp.mlsuite.user.domain.model.User;

public record UserDto(
        Long id,
        String userName,
        String email,
        String oauthProvider,
        String fullName,
        String avatarUrl,
        String createdAt) {

    public static final UserDto toDto(User user) {
        return new UserDto(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getOauthProvider().toString(),
                user.getFullName(),
                user.getAvatarUrl(),
                user.getCreatedAt().format(DateTimeFormatter.ofPattern("MMM, yyyy")));
    }
}

