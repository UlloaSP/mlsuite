package dev.ulloasp.mlsuite.apiaccess.domain.exception;

import java.util.UUID;

/**
 * A refused call to the client API, answered as an RFC 9457 problem. {@code requestId} is set
 * once the call was logged under it; {@code retryAfterSeconds} when waiting is the remedy.
 */
public class ApiProblem extends RuntimeException {

    private final ApiErrorCode code;
    private final Long retryAfterSeconds;
    private final UUID requestId;

    public ApiProblem(ApiErrorCode code, String detail) {
        this(code, detail, null, null);
    }

    public ApiProblem(ApiErrorCode code, String detail, Long retryAfterSeconds) {
        this(code, detail, retryAfterSeconds, null);
    }

    private ApiProblem(ApiErrorCode code, String detail, Long retryAfterSeconds, UUID requestId) {
        super(detail);
        this.code = code;
        this.retryAfterSeconds = retryAfterSeconds;
        this.requestId = requestId;
    }

    /** The same problem, answered as the call logged under {@code id}. */
    public ApiProblem forRequest(UUID id) {
        return new ApiProblem(code, getMessage(), retryAfterSeconds, id);
    }

    public ApiErrorCode code() {
        return code;
    }

    public Long retryAfterSeconds() {
        return retryAfterSeconds;
    }

    public UUID requestId() {
        return requestId;
    }
}
