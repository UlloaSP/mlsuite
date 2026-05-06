package dev.ulloasp.mlsuite.workspace.application.dto;

import dev.ulloasp.mlsuite.user.domain.model.User;

public record WorkspaceUserDto(Long id, String fullName, String email, String avatarUrl) {

    public static WorkspaceUserDto from(User user) {
        return new WorkspaceUserDto(user.getId(), user.getFullName(), user.getEmail(), user.getAvatarUrl());
    }
}
