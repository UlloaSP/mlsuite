package dev.ulloasp.mlsuite.apiaccess.application.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import dev.ulloasp.mlsuite.apiaccess.domain.exception.ApiErrorCode;
import dev.ulloasp.mlsuite.apiaccess.domain.exception.ApiProblem;
import dev.ulloasp.mlsuite.schema.application.service.RuntimeSlots;

/**
 * The runtime's share for API clients, apart from the public pages' share, so neither can take
 * the other's.
 */
@Component
public class ApiRuntimeSlots extends RuntimeSlots {

    static final long RETRY_AFTER_SECONDS = 5;

    public ApiRuntimeSlots(@Value("${mlsuite.api-access.max-concurrent}") int maxConcurrent) {
        super(maxConcurrent, () -> new ApiProblem(ApiErrorCode.RUNTIME_BUSY,
                "Every runtime slot for API clients is in use. Retry shortly.", RETRY_AFTER_SECONDS));
    }
}
