package dev.ulloasp.mlsuite.model;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.web.multipart.MultipartFile;

import dev.ulloasp.mlsuite.model.controllers.AnalyzerControllerImpl;
import dev.ulloasp.mlsuite.model.dtos.ExplainRequest;
import dev.ulloasp.mlsuite.model.exceptions.AnalyzerServiceException;
import dev.ulloasp.mlsuite.model.services.AnalyzerService;
import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import dev.ulloasp.mlsuite.security.identity.CurrentUserResolver;
import jakarta.servlet.http.HttpServletRequest;

@ExtendWith(MockitoExtension.class)
class AnalyzerControllerTest {

    @Mock
    private CurrentUserResolver currentUserResolver;

    @Mock
    private AnalyzerService analyzerService;

    @Mock
    private OAuth2AuthenticationToken authentication;

    @Mock
    private MultipartFile modelFile;

    @Mock
    private HttpServletRequest request;

    private AnalyzerControllerImpl controller;

    @BeforeEach
    void setUp() {
        controller = new AnalyzerControllerImpl(currentUserResolver, analyzerService);
        when(currentUserResolver.resolve(authentication)).thenReturn(new CurrentUser(5L, "alice"));
    }

    @Test
    void generateSchema_UsesInternalUserId() {
        when(analyzerService.generateInputSignature(5L, modelFile, null)).thenReturn(Map.of("x", "int"));

        ResponseEntity<Map<String, Object>> response = controller.generateSchema(authentication, modelFile, null);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(analyzerService).generateInputSignature(5L, modelFile, null);
    }

    @Test
    void predict_UsesInternalUserId() {
        when(analyzerService.predict(5L, 5L, 11L, Map.of("x", 1))).thenReturn(Map.of("prediction", 1));

        ResponseEntity<Map<String, Object>> response = controller.predict(authentication, 11L, Map.of("x", 1));

        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(analyzerService).predict(5L, 5L, 11L, Map.of("x", 1));
    }

    @Test
    void explain_PropagatesAnalyzerErrors() {
        ExplainRequest requestBody = new ExplainRequest();
        when(analyzerService.explain(5L, 5L, 11L, requestBody))
                .thenThrow(new AnalyzerServiceException(422, "/explain", "bad", "bad", null));

        assertThrows(AnalyzerServiceException.class, () -> controller.explain(authentication, 11L, requestBody));
    }
}
