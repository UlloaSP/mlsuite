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
import dev.ulloasp.mlsuite.prediction.controllers.OutputFeedbackControllerImpl;
import dev.ulloasp.mlsuite.prediction.dtos.CreateOutputFeedbackParams;
import dev.ulloasp.mlsuite.prediction.dtos.UpdateOutputFeedbackParams;
import dev.ulloasp.mlsuite.prediction.entities.OutputFeedback;
import dev.ulloasp.mlsuite.prediction.entities.Prediction;
import dev.ulloasp.mlsuite.prediction.exceptions.OutputFeedbackDoesNotExistsException;
import dev.ulloasp.mlsuite.prediction.services.OutputFeedbackService;
import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import dev.ulloasp.mlsuite.security.identity.CurrentUserResolver;
import dev.ulloasp.mlsuite.signature.entities.Signature;

@ExtendWith(MockitoExtension.class)
class OutputFeedbackControllerTest {

    @Mock
    private CurrentUserResolver currentUserResolver;

    @Mock
    private OutputFeedbackService outputFeedbackService;

    @Mock
    private OAuth2AuthenticationToken authentication;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private OutputFeedbackControllerImpl controller;

    @BeforeEach
    void setUp() {
        controller = new OutputFeedbackControllerImpl(currentUserResolver, outputFeedbackService);
        when(currentUserResolver.resolve(authentication)).thenReturn(new CurrentUser(3L, "alice"));
    }

    @Test
    void createOutputFeedback_UsesInternalUserId() throws Exception {
        CreateOutputFeedbackParams params = new CreateOutputFeedbackParams();
        params.setPredictionId(11L);
        params.setOrder(1);
        params.setValue(objectMapper.valueToTree(Map.of("assessment", "correct")));
        when(outputFeedbackService.createOutputFeedback(3L, 11L, 1, params.getValue()))
                .thenReturn(outputFeedback(params.getValue()));

        ResponseEntity<?> response = controller.createOutputFeedback(authentication, params);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        verify(outputFeedbackService).createOutputFeedback(3L, 11L, 1, params.getValue());
    }

    @Test
    void updateOutputFeedback_UsesInternalUserId() throws Exception {
        UpdateOutputFeedbackParams params = new UpdateOutputFeedbackParams();
        params.setOutputFeedbackId(12L);
        params.setValue(objectMapper.valueToTree(Map.of("assessment", "incorrect")));
        when(outputFeedbackService.updateOutputFeedback(3L, 12L, params.getValue()))
                .thenReturn(outputFeedback(params.getValue()));

        ResponseEntity<?> response = controller.updateOutputFeedback(authentication, params);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        verify(outputFeedbackService).updateOutputFeedback(3L, 12L, params.getValue());
    }

    @Test
    void getAllOutputFeedback_PropagatesMissingErrors() {
        when(outputFeedbackService.getOutputFeedbackByPredictionId(3L, 99L))
                .thenThrow(new OutputFeedbackDoesNotExistsException(99L, "alice"));

        assertThrows(OutputFeedbackDoesNotExistsException.class,
                () -> controller.getAllOutputFeedback(authentication, 99L));
    }

    @Test
    void getAllOutputFeedback_ReturnsDtos() throws Exception {
        when(outputFeedbackService.getOutputFeedbackByPredictionId(3L, 11L))
                .thenReturn(List.of(outputFeedback(objectMapper.valueToTree(Map.of("assessment", "correct")))));

        assertEquals(1, controller.getAllOutputFeedback(authentication, 11L).getBody().size());
    }

    private OutputFeedback outputFeedback(com.fasterxml.jackson.databind.JsonNode value) {
        Model model = new Model();
        model.setId(1L);
        Signature signature = new Signature();
        signature.setModel(model);
        Prediction prediction = new Prediction();
        prediction.setId(11L);
        prediction.setSignature(signature);
        prediction.setPrediction(Map.of());
        prediction.setData(Map.of());
        OutputFeedback outputFeedback = new OutputFeedback();
        outputFeedback.setId(12L);
        outputFeedback.setPrediction(prediction);
        outputFeedback.setOrder(1);
        outputFeedback.setValue(value);
        return outputFeedback;
    }
}
