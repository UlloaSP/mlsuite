package dev.ulloasp.mlsuite.schema.domain.exception;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** A run its share of the runtime cannot take now: 503, with how long to wait before retrying. */
public class RuntimeBusyException extends ResponseStatusException {

    private final long retryAfterSeconds;

    public RuntimeBusyException(String reason, long retryAfterSeconds) {
        super(HttpStatus.SERVICE_UNAVAILABLE, reason);
        this.retryAfterSeconds = retryAfterSeconds;
    }

    public long getRetryAfterSeconds() {
        return retryAfterSeconds;
    }

    @Override
    public HttpHeaders getHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.set(HttpHeaders.RETRY_AFTER, String.valueOf(retryAfterSeconds));
        return headers;
    }
}
