package dev.ulloasp.mlsuite.model.application.service;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.model.domain.model.Model;

class ModelVersionGuardTest {

    @Test
    void compatibilityWindowAcceptsAnOlderClientWithoutAVersion() {
        Model model = modelAtVersion(4L);

        assertDoesNotThrow(() -> ModelVersionGuard.requireCurrent(model, null, false));
    }

    @Test
    void strictModeRequiresAVersionAndStillRejectsAStaleOne() {
        Model model = modelAtVersion(4L);

        var missing = assertThrows(ResponseStatusException.class,
                () -> ModelVersionGuard.requireCurrent(model, null, true));
        var stale = assertThrows(ResponseStatusException.class,
                () -> ModelVersionGuard.requireCurrent(model, 3L, true));

        assertEquals(HttpStatus.PRECONDITION_REQUIRED, missing.getStatusCode());
        assertEquals(HttpStatus.CONFLICT, stale.getStatusCode());
    }

    private Model modelAtVersion(long version) {
        Model model = new Model();
        model.setVersion(version);
        return model;
    }
}
