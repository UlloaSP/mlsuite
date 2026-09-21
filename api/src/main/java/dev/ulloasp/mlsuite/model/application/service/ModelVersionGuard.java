package dev.ulloasp.mlsuite.model.application.service;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.model.domain.model.Model;

final class ModelVersionGuard {

    private ModelVersionGuard() {
    }

    static void requireCurrent(Model model, Long expectedVersion, boolean required) {
        if (expectedVersion == null) {
            if (required) {
                throw new ResponseStatusException(HttpStatus.PRECONDITION_REQUIRED,
                        "Model version is required; refresh and retry");
            }
            return;
        }
        if (model.getVersion() == null || !model.getVersion().equals(expectedVersion)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Model changed since it was loaded; refresh and retry");
        }
    }
}
