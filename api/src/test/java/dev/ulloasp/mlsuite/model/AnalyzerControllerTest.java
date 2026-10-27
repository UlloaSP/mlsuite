package dev.ulloasp.mlsuite.model;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import dev.ulloasp.mlsuite.model.adapter.in.web.AnalyzerController;
import dev.ulloasp.mlsuite.model.application.dto.ExplainRequest;
import dev.ulloasp.mlsuite.model.application.port.in.AnalyzerUseCase;
import dev.ulloasp.mlsuite.model.domain.exception.AnalyzerServiceException;
import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import jakarta.servlet.http.HttpServletRequest;

@ExtendWith(MockitoExtension.class)
class AnalyzerControllerTest {

    @Mock
    private AnalyzerUseCase analyzerUseCase;
    private CurrentUser user;

    @Mock
    private HttpServletRequest request;

    private AnalyzerController controller;

    @BeforeEach
    void setUp() {
        controller = new AnalyzerController(analyzerUseCase);
        user = new CurrentUser(5L, "alice", dev.ulloasp.mlsuite.user.domain.model.SystemRole.USER);
    }

    @Test
    void explain_PropagatesAnalyzerErrors() {
        ExplainRequest requestBody = new ExplainRequest(Map.of("feature", 1), null);
        when(analyzerUseCase.explain(5L, 11L, requestBody))
                .thenThrow(new AnalyzerServiceException(422, "bad"));

        assertThrows(AnalyzerServiceException.class, () -> controller.explain(user, 11L, requestBody));
    }
}

