package dev.ulloasp.mlsuite.model.application.runtime;

import dev.ulloasp.mlsuite.schema.domain.exception.RuntimeBusyException;

/**
 * The model's environment is still being prepared: like a busy runtime, the run is answered 503
 * with a time to retry, and a bulk job hands its rows back to run them later.
 */
public class ModelPreparingException extends RuntimeBusyException {

    static final long RETRY_AFTER_SECONDS = 30;

    public ModelPreparingException() {
        super("The model's environment is being prepared. Try again shortly.", RETRY_AFTER_SECONDS);
    }
}
