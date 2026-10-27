package dev.ulloasp.mlsuite.security.auth;

import java.time.Duration;

/** A network has used up its sign-in failures or registration attempts until {@code retryAfter} passes. */
public class AuthAttemptLimitException extends RuntimeException {

    private final Duration retryAfter;

    public AuthAttemptLimitException(boolean login, Duration retryAfter) {
        super(login
                ? "Too many failed sign-in attempts from your network. Try again later."
                : "Too many registration attempts from your network. Try again later.");
        this.retryAfter = retryAfter;
    }

    public Duration getRetryAfter() {
        return retryAfter;
    }
}
