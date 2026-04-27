package dev.ulloasp.mlsuite.prediction;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;

import com.fasterxml.jackson.databind.ObjectMapper;

import dev.ulloasp.mlsuite.model.entities.Model;
import dev.ulloasp.mlsuite.prediction.controllers.ExplanationFeedbackControllerImpl;
import dev.ulloasp.mlsuite.prediction.dtos.CreateExplanationFeedbackParams;
import dev.ulloasp.mlsuite.prediction.dtos.UpdateExplanationFeedbackParams;
import dev.ulloasp.mlsuite.prediction.entities.ExplanationFeedback;
import dev.ulloasp.mlsuite.prediction.entities.Prediction;
import dev.ulloasp.mlsuite.prediction.exceptions.ExplanationFeedbackDoesNotExistsException;
import dev.ulloasp.mlsuite.prediction.services.ExplanationFeedbackService;
import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import dev.ulloasp.mlsuite.security.identity.CurrentUserResolver;
import dev.ulloasp.mlsuite.signature.entities.Signature;

@ExtendWith(MockitoExtension.class)
class ExplanationFeedbackControllerTest {

    @Mock
    private CurrentUserResolver currentUserResolver;

    @Mock
    private ExplanationFeedbackService explanationFeedbackService;

    @Mock
    private OAuth2AuthenticationToken authentication;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private ExplanationFeedbackControllerImpl controller;

    @BeforeEach
    void setUp() {
        controller = new ExplanationFeedbackControllerImpl(currentUserResolver, explanationFeedbackService);
        when(currentUserResolver.resolve(authentication)).thenReturn(new CurrentUser(3L, "alice"));
    }

    @Test
    void createExplanationFeedback_UsesInternalUserId() throws Exception {
        CreateExplanationFeedbackParams params = new CreateExplanationFeedbackParams();
        params.setPredictionId(11L);
        params.setOrder(1);
        params.setValue(objectMapper.valueToTree(Map.of("feedback-step-notes", "tree")));
        when(explanationFeedbackService.createExplanationFeedback(3L, 11L, 1, params.getValue()))
                .thenReturn(explanationFeedback(params.getValue()));

        ResponseEntity<?> response = controller.createExplanationFeedback(authentication, params);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        verify(explanationFeedbackService).createExplanationFeedback(3L, 11L, 1, params.getValue());
    }

    @Test
    void updateExplanationFeedback_UsesInternalUserId() throws Exception {
        UpdateExplanationFeedbackParams params = new UpdateExplanationFeedbackParams();
        params.setExplanationFeedbackId(12L);
        params.setRealValue(objectMapper.valueToTree(Map.of("feedback-step-notes", "fixed")));
        when(explanationFeedbackService.updateExplanationFeedback(3L, 12L, params.getRealValue()))
                .thenReturn(explanationFeedback(params.getRealValue()));

        ResponseEntity<?> response = controller.updateExplanationFeedback(authentication, params);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        verify(explanationFeedbackService).updateExplanationFeedback(3L, 12L, params.getRealValue());
    }

    @Test
    void getAllExplanationFeedback_PropagatesMissingErrors() {
        when(explanationFeedbackService.getExplanationFeedbackByPredictionId(3L, 99L))
                .thenThrow(new ExplanationFeedbackDoesNotExistsException(99L, "alice"));

        assertThrows(ExplanationFeedbackDoesNotExistsException.class,
                () -> controller.getAllExplanationFeedback(authentication, 99L));
    }

    @Test
    void getAllExplanationFeedback_ReturnsDtos() {
        when(explanationFeedbackService.getExplanationFeedbackByPredictionId(3L, 11L))
                .thenReturn(List.of(explanationFeedback(objectMapper.valueToTree("tree"))));

        assertEquals(1, controller.getAllExplanationFeedback(authentication, 11L).getBody().size());
    }

    private ExplanationFeedback explanationFeedback(com.fasterxml.jackson.databind.JsonNode value) {
        Model model = new Model();
        model.setId(1L);
        Signature signature = new Signature();
        signature.setModel(model);
        Prediction prediction = new Prediction();
        prediction.setId(11L);
        prediction.setSignature(signature);
        prediction.setPrediction(Map.of());
        prediction.setData(Map.of());
        ExplanationFeedback explanationFeedback = new ExplanationFeedback();
        explanationFeedback.setId(12L);
        explanationFeedback.setPrediction(prediction);
        explanationFeedback.setOrder(1);
        explanationFeedback.setValue(value);
        explanationFeedback.setRealValue(value);
        return explanationFeedback;
    }
}
