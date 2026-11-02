package dev.ulloasp.mlsuite.model.application.service;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.model.domain.model.Model;

/**
 * A change to a model names the version it was made on, so a stale page cannot overwrite a newer
 * change: without one it is refused (428), and with an old one it conflicts (409).
 */
final class ModelVersionGuard {

    private ModelVersionGuard() {
    }

    static void requireCurrent(Model model, Long expectedVersion) {
        if (expectedVersion == null) {
            throw new ResponseStatusException(HttpStatus.PRECONDITION_REQUIRED,
                    "Model version is required; refresh and retry");
        }
        if (model.getVersion() == null || !model.getVersion().equals(expectedVersion)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Model changed since it was loaded; refresh and retry");
        }
    }
}
