package dev.ulloasp.mlsuite.model.application.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.schema.application.service.RuntimeSlots;

/**
 * The runtime's share for the predictions and explanations of workspace members, apart from the
 * public pages' and API clients' shares; 503 when it is all in use.
 */
@Component
public class WorkspaceRuntimeSlots extends RuntimeSlots {

    public WorkspaceRuntimeSlots(@Value("${mlsuite.workspace-prediction.max-concurrent}") int maxConcurrent) {
        super(maxConcurrent, () -> new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                "Too many workspace runs are in progress. Try again in a moment."));
    }
}
