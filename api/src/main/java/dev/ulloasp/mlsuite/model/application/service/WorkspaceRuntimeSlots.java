package dev.ulloasp.mlsuite.model.application.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import dev.ulloasp.mlsuite.schema.application.service.RuntimeQueue;
import dev.ulloasp.mlsuite.schema.application.service.RuntimeSlots;
import dev.ulloasp.mlsuite.schema.domain.exception.RuntimeBusyException;

/**
 * The runtime's share for the predictions, explanations and artifact inspections of workspace
 * members, apart from the public pages' and API clients' shares; a member's runs queue for it and
 * are answered 503 with Retry-After only when they cannot be queued or their turn does not come.
 */
@Component
public class WorkspaceRuntimeSlots extends RuntimeSlots {

    public WorkspaceRuntimeSlots(@Value("${mlsuite.workspace-prediction.max-concurrent}") int maxConcurrent,
            RuntimeQueue queue) {
        super(maxConcurrent, queue, retryAfter -> new RuntimeBusyException(
                "Too many workspace runs are in progress. Try again in a moment.", retryAfter));
    }
}
