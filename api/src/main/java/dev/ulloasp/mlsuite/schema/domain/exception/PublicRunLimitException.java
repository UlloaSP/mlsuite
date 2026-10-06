package dev.ulloasp.mlsuite.schema.domain.exception;

import java.time.Duration;
import java.time.Instant;

/** A caller has used every public run a bookmark allows them until {@code resetsAt}. */
public class PublicRunLimitException extends RuntimeException {

    private final boolean signedIn;
    private final int limit;
    private final Instant resetsAt;
    private final Duration retryAfter;

    public PublicRunLimitException(boolean signedIn, int limit, Instant resetsAt, Duration retryAfter) {
        super(signedIn
                ? "You have used the %d runs an account gets on this bookmark in 24 hours.".formatted(limit)
                : "You have used the %d runs this bookmark allows without an account in 24 hours. Sign in for more."
                        .formatted(limit));
        this.signedIn = signedIn;
        this.limit = limit;
        this.resetsAt = resetsAt;
        this.retryAfter = retryAfter;
    }

    public boolean isSignedIn() {
        return signedIn;
    }

    public int getLimit() {
        return limit;
    }

    public Instant getResetsAt() {
        return resetsAt;
    }

    public Duration getRetryAfter() {
        return retryAfter;
    }
}
