package dev.ulloasp.mlsuite.model.application.runtime;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** The model's environment could not be prepared, so it cannot run until it is prepared again. */
public class ModelUnavailableException extends ResponseStatusException {

    public ModelUnavailableException() {
        super(HttpStatus.CONFLICT, "The model cannot run: its environment could not be prepared.");
    }
}
