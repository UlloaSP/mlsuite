package dev.ulloasp.mlsuite.model;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Map;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.multipart.MultipartFile;

import dev.ulloasp.mlsuite.model.adapter.in.web.AnalyzerControllerImpl;
import dev.ulloasp.mlsuite.model.application.dto.ExplainRequest;
import dev.ulloasp.mlsuite.model.application.port.in.AnalyzerUseCase;
import dev.ulloasp.mlsuite.model.domain.exception.AnalyzerServiceException;
import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import dev.ulloasp.mlsuite.security.identity.CurrentUserResolver;
import jakarta.servlet.http.HttpServletRequest;

@ExtendWith(MockitoExtension.class)
class AnalyzerControllerTest {

    @Mock
    private CurrentUserResolver currentUserResolver;

    @Mock
    private AnalyzerUseCase analyzerUseCase;

    @Mock
    private Authentication authentication;

    @Mock
    private MultipartFile modelFile;

    @Mock
    private HttpServletRequest request;

    private AnalyzerControllerImpl controller;

    @BeforeEach
    void setUp() {
        controller = new AnalyzerControllerImpl(currentUserResolver, analyzerUseCase);
        when(currentUserResolver.resolve(authentication)).thenReturn(new CurrentUser(5L, "alice", dev.ulloasp.mlsuite.user.domain.model.SystemRole.USER));
    }

    @Test
    void generateSchema_UsesInternalUserId() {
        when(analyzerUseCase.generateInputSchema(5L, modelFile, null)).thenReturn(Map.of("x", "int"));

        ResponseEntity<Map<String, Object>> response = controller.generateSchema(authentication, modelFile, null);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(analyzerUseCase).generateInputSchema(5L, modelFile, null);
    }

    @Test
    void inspectArtifact_UsesInternalUserId() {
        when(analyzerUseCase.inspectArtifact(5L, modelFile)).thenReturn(Map.of("kind", "model"));

        ResponseEntity<Map<String, Object>> response = controller.inspectArtifact(authentication, modelFile);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("model", response.getBody().get("kind"));
        verify(analyzerUseCase).inspectArtifact(5L, modelFile);
    }

    @Test
    void matchArtifacts_UsesInternalUserId() {
        when(analyzerUseCase.matchArtifacts(5L, List.of(modelFile), List.of(modelFile)))
                .thenReturn(Map.of("models", List.of()));

        ResponseEntity<Map<String, Object>> response = controller.matchArtifacts(
                authentication,
                List.of(modelFile),
                List.of(modelFile));

        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(analyzerUseCase).matchArtifacts(5L, List.of(modelFile), List.of(modelFile));
    }

    @Test
    void predict_UsesInternalUserId() {
        when(analyzerUseCase.predict(5L, 11L, Map.of("x", 1))).thenReturn(Map.of("prediction", 1));

        ResponseEntity<Map<String, Object>> response = controller.predict(authentication, 11L, Map.of("x", 1));

        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(analyzerUseCase).predict(5L, 11L, Map.of("x", 1));
    }

    @Test
    void explain_PropagatesAnalyzerErrors() {
        ExplainRequest requestBody = new ExplainRequest(Map.of("feature", 1), null);
        when(analyzerUseCase.explain(5L, 11L, requestBody))
                .thenThrow(new AnalyzerServiceException(422, "/explain", "bad", "bad", null));

        assertThrows(AnalyzerServiceException.class, () -> controller.explain(authentication, 11L, requestBody));
    }
}

