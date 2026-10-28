package dev.ulloasp.mlsuite.schema.application.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import dev.ulloasp.mlsuite.schema.domain.exception.RuntimeBusyException;

/** The runtime's share for the runs of public pages; queued, 503 with Retry-After when it cannot be. */
@Component
public class PublicRuntimeSlots extends RuntimeSlots {

    public PublicRuntimeSlots(@Value("${mlsuite.public-prediction.max-concurrent}") int maxConcurrent,
            RuntimeQueue queue) {
        super(maxConcurrent, queue, retryAfter -> new RuntimeBusyException(
                "Too many public runs are in progress. Try again in a moment.", retryAfter));
    }
}
