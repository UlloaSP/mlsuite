package dev.ulloasp.mlsuite.apiaccess.application.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import dev.ulloasp.mlsuite.apiaccess.domain.exception.ApiErrorCode;
import dev.ulloasp.mlsuite.apiaccess.domain.exception.ApiProblem;
import dev.ulloasp.mlsuite.schema.application.service.RuntimeQueue;
import dev.ulloasp.mlsuite.schema.application.service.RuntimeSlots;

/**
 * The runtime's share for API clients, apart from the public pages' share, so neither can take
 * the other's. Each client's runs queue for it.
 */
@Component
public class ApiRuntimeSlots extends RuntimeSlots {

    public ApiRuntimeSlots(@Value("${mlsuite.api-access.max-concurrent}") int maxConcurrent, RuntimeQueue queue) {
        super(maxConcurrent, queue, retryAfter -> new ApiProblem(ApiErrorCode.RUNTIME_BUSY,
                "Every runtime slot for API clients is in use. Retry shortly.", retryAfter));
    }
}
