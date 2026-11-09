package dev.ulloasp.mlsuite.schema.review.application.dto;

import dev.ulloasp.mlsuite.principal.domain.model.Principal;
import jakarta.annotation.Nullable;

/** Who created a review: unlike a reviewer, they may be gone while the review stays. */
public record SchemaReviewCreatorDto(String fullName, @Nullable String email) {
    public static SchemaReviewCreatorDto from(Principal creator) {
        return new SchemaReviewCreatorDto(creator.label(), creator.email());
    }
}
