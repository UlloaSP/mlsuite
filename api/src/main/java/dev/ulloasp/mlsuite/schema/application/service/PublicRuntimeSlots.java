package dev.ulloasp.mlsuite.schema.application.service;

import java.util.concurrent.Semaphore;
import java.util.function.Supplier;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

/**
 * The runtime is one process shared by every workspace; runs made from outside the workspace,
 * on public pages or with API keys, may take only this much of it together. A run that finds
 * no free slot is turned away at once rather than queued.
 */
@Component
public class PublicRuntimeSlots {

    private final Semaphore slots;

    public PublicRuntimeSlots(@Value("${mlsuite.public-prediction.max-concurrent}") int maxConcurrent) {
        this.slots = new Semaphore(maxConcurrent);
    }

    /** Does the work in a slot, which is returned however the work ends; 503 when none is free. */
    public <T> T run(Supplier<T> work) {
        if (!slots.tryAcquire()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Too many public runs are in progress. Try again in a moment.");
        }
        try {
            return work.get();
        } finally {
            slots.release();
        }
    }
}
