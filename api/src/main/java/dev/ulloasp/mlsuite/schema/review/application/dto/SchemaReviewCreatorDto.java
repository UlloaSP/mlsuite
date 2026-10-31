package dev.ulloasp.mlsuite.schema.review.application.dto;

import dev.ulloasp.mlsuite.user.domain.model.DeletedUser;
import dev.ulloasp.mlsuite.user.domain.model.User;
import jakarta.annotation.Nullable;

/** Who created a review: unlike a reviewer, they may be gone while the review stays. */
public record SchemaReviewCreatorDto(String fullName, @Nullable String email) {
    public static SchemaReviewCreatorDto from(@Nullable User user) {
        return user == null ? new SchemaReviewCreatorDto(DeletedUser.NAME, null)
                : new SchemaReviewCreatorDto(user.getFullName(), user.getEmail());
    }
}
