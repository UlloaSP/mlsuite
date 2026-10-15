package dev.ulloasp.mlsuite.apiaccess.domain.exception;

import java.util.Locale;

import org.springframework.http.HttpStatus;

/**
 * Why a call to the client API was refused, as clients read it: the code is part of the
 * contract and never changes meaning; the detail sent with it is prose and may.
 */
public enum ApiErrorCode {
    INVALID_BODY(HttpStatus.BAD_REQUEST, "Invalid request body"),
    INVALID_FEATURES(HttpStatus.BAD_REQUEST, "Invalid features"),
    INVALID_KEY(HttpStatus.UNAUTHORIZED, "Invalid API key"),
    CLIENT_SUSPENDED(HttpStatus.FORBIDDEN, "Client suspended"),
    BOOKMARK_NOT_FOUND(HttpStatus.NOT_FOUND, "Bookmark not found"),
    BOOKMARK_NOT_RUNNABLE(HttpStatus.CONFLICT, "Bookmark cannot be run"),
    BOOKMARK_CHANGED(HttpStatus.CONFLICT, "Bookmark changed during the run"),
    FEATURES_REJECTED(HttpStatus.UNPROCESSABLE_ENTITY, "Features rejected by the model"),
    RATE_LIMITED(HttpStatus.TOO_MANY_REQUESTS, "Rate limit reached"),
    QUOTA_EXCEEDED(HttpStatus.TOO_MANY_REQUESTS, "Monthly quota used"),
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "Internal error"),
    RUNTIME_FAILED(HttpStatus.BAD_GATEWAY, "Prediction failed"),
    RUNTIME_BUSY(HttpStatus.SERVICE_UNAVAILABLE, "Runtime busy");

    private final HttpStatus status;
    private final String title;

    ApiErrorCode(HttpStatus status, String title) {
        this.status = status;
        this.title = title;
    }

    public HttpStatus status() {
        return status;
    }

    public String title() {
        return title;
    }

    /** The code as sent: {@code rate_limited}. */
    public String code() {
        return name().toLowerCase(Locale.ROOT);
    }
}
