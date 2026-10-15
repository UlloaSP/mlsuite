package dev.ulloasp.mlsuite.schema.application.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

/** The runtime's share for the runs of public pages; 503 when it is all in use. */
@Component
public class PublicRuntimeSlots extends RuntimeSlots {

    public PublicRuntimeSlots(@Value("${mlsuite.public-prediction.max-concurrent}") int maxConcurrent) {
        super(maxConcurrent, () -> new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                "Too many public runs are in progress. Try again in a moment."));
    }
}
