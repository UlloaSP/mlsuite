package dev.ulloasp.mlsuite.invitation.application.dto;

import dev.ulloasp.mlsuite.user.domain.model.User;

public record InvitationCandidateDto(
        Long id,
        String fullName,
        String email,
        String avatarUrl) {

    public static InvitationCandidateDto from(User user) {
        return new InvitationCandidateDto(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getAvatarUrl());
    }
}
