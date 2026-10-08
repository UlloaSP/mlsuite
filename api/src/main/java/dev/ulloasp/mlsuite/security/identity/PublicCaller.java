package dev.ulloasp.mlsuite.security.identity;

import java.util.UUID;

import jakarta.annotation.Nullable;

/**
 * Who made a request to the public surface. {@code key} is what the request is counted against:
 * the account when it carries a session, otherwise the network it came from, named without
 * holding an address ({@link PublicCallerArgumentResolver} stores only a keyed hash of it).
 * {@code userId} is the account when signed in. {@code visitorId} is the id the browser's
 * visitor cookie carries, session or not: a public page's runs belong to the browser they were
 * made in, and an account only adds its name to them. It is null without a cookie or with a
 * malformed one, and is believed only once the id is found stored.
 */
public record PublicCaller(boolean signedIn, String key, @Nullable Long userId, @Nullable UUID visitorId) {

    public static PublicCaller anonymous(String key, @Nullable UUID visitorId) {
        return new PublicCaller(false, key, null, visitorId);
    }

    public static PublicCaller signedIn(Long userId, @Nullable UUID visitorId) {
        return new PublicCaller(true, "user:" + userId, userId, visitorId);
    }
}
