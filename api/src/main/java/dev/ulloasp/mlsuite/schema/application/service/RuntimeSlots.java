package dev.ulloasp.mlsuite.schema.application.service;

import java.util.concurrent.Semaphore;
import java.util.function.Supplier;

/**
 * A share of the runtime, which is one process serving every workspace: at most this many runs
 * of one kind use it at once. A run that finds no free slot is turned away at once with
 * {@code busy} rather than queued.
 */
public class RuntimeSlots {

    private final Semaphore slots;
    private final Supplier<RuntimeException> busy;

    protected RuntimeSlots(int maxConcurrent, Supplier<RuntimeException> busy) {
        this.slots = new Semaphore(maxConcurrent);
        this.busy = busy;
    }

    /** Does the work in a slot, which is returned however the work ends. */
    public <T> T run(Supplier<T> work) {
        if (!slots.tryAcquire()) throw busy.get();
        try {
            return work.get();
        } finally {
            slots.release();
        }
    }
}
