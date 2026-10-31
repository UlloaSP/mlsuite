package dev.ulloasp.mlsuite.user.application.dto;

import java.time.OffsetDateTime;

import dev.ulloasp.mlsuite.user.domain.model.User;

/**
 * Where a person's avatar is read from, by anyone. The path carries the time it was last replaced,
 * so a browser may cache it for good and a new avatar is a new address.
 */
public final class UserAvatarUrl {

    private UserAvatarUrl() {
    }

    public static String of(User user) {
        return of(user.getId(), user.getAvatarUpdatedAt());
    }

    /** The same address from the two columns it is made of, for a query that selects no entity. */
    public static String of(Long userId, OffsetDateTime avatarUpdatedAt) {
        if (avatarUpdatedAt == null) return null;
        return "/api/public/users/%d/avatar?v=%d".formatted(userId, avatarUpdatedAt.toInstant().toEpochMilli());
    }
}
