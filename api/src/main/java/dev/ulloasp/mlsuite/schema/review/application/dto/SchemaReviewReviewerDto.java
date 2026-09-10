package dev.ulloasp.mlsuite.schema.review.application.dto;

import dev.ulloasp.mlsuite.user.domain.model.User;

public record SchemaReviewReviewerDto(Long id, String fullName, String email) {
    public static SchemaReviewReviewerDto from(User user) {
        return new SchemaReviewReviewerDto(user.getId(), user.getFullName(), user.getEmail());
    }
}
