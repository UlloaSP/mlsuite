package dev.ulloasp.mlsuite.schema.review.application.dto;

import java.time.OffsetDateTime;

import dev.ulloasp.mlsuite.user.application.dto.UserAvatarUrl;
import dev.ulloasp.mlsuite.user.domain.model.User;
import jakarta.annotation.Nullable;

public record SchemaReviewReviewerDto(Long id, String fullName, String email, @Nullable String avatarUrl) {

    /** For the assignment catalog, whose query builds this from columns. */
    public SchemaReviewReviewerDto(Long id, String fullName, String email, OffsetDateTime avatarUpdatedAt) {
        this(id, fullName, email, UserAvatarUrl.of(id, avatarUpdatedAt));
    }

    public static SchemaReviewReviewerDto from(User user) {
        return new SchemaReviewReviewerDto(user.getId(), user.getFullName(), user.getEmail(), UserAvatarUrl.of(user));
    }
}
