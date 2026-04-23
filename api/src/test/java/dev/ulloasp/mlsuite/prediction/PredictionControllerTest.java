package dev.ulloasp.mlsuite.prediction;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.lenient;
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

import dev.ulloasp.mlsuite.model.entities.Model;
import dev.ulloasp.mlsuite.prediction.controllers.PredictionControllerImpl;
import dev.ulloasp.mlsuite.prediction.dtos.CreatePredictionParams;
import dev.ulloasp.mlsuite.prediction.dtos.UpdatePredictionParams;
import dev.ulloasp.mlsuite.prediction.entities.Prediction;
import dev.ulloasp.mlsuite.prediction.entities.PredictionStatus;
import dev.ulloasp.mlsuite.prediction.exceptions.PredictionDoesNotExistsException;
import dev.ulloasp.mlsuite.prediction.services.PredictionService;
import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import dev.ulloasp.mlsuite.security.identity.CurrentUserResolver;
import dev.ulloasp.mlsuite.signature.entities.Signature;
import dev.ulloasp.mlsuite.signature.exceptions.InvalidSignatureSchemaException;
import dev.ulloasp.mlsuite.util.ErrorDto;
import jakarta.servlet.http.HttpServletRequest;

@ExtendWith(MockitoExtension.class)
class PredictionControllerTest {

    @Mock
    private CurrentUserResolver currentUserResolver;

    @Mock
    private PredictionService predictionService;

    @Mock
    private OAuth2AuthenticationToken authentication;

    @Mock
    private HttpServletRequest request;

    private PredictionControllerImpl controller;

    @BeforeEach
    void setUp() {
        controller = new PredictionControllerImpl(currentUserResolver, predictionService);
        lenient().when(currentUserResolver.resolve(authentication)).thenReturn(new CurrentUser(3L, "alice"));
    }

    @Test
    void createPrediction_UsesInternalUserId() {
        CreatePredictionParams params = new CreatePredictionParams();
        params.setSignatureId(11L);
        params.setName("pred");
        params.setOverwrite(true);
        params.setPrediction(Map.of("value", 1));
        params.setInputs(Map.of("x", 2));
        when(predictionService.createPrediction(3L, 11L, "pred", true, Map.of("value", 1), Map.of("x", 2)))
                .thenReturn(prediction("pred", PredictionStatus.PENDING));

        ResponseEntity<?> response = controller.createPrediction(authentication, params);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        verify(predictionService).createPrediction(3L, 11L, "pred", true, Map.of("value", 1), Map.of("x", 2));
    }

    @Test
    void updatePrediction_UsesInternalUserId() {
        UpdatePredictionParams params = new UpdatePredictionParams();
        params.setPredictionId(12L);
        params.setStatus("SUCCESS");
        when(predictionService.updatePrediction(3L, 12L, PredictionStatus.SUCCESS))
                .thenReturn(prediction("pred", PredictionStatus.SUCCESS));

        ResponseEntity<?> response = controller.updatePrediction(authentication, params);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        verify(predictionService).updatePrediction(3L, 12L, PredictionStatus.SUCCESS);
    }

    @Test
    void getAllPredictions_PropagatesMissingPredictionErrors() {
        when(predictionService.getPredictionsBySignatureId(3L, 99L))
                .thenThrow(new PredictionDoesNotExistsException(99L, "alice"));

        assertThrows(PredictionDoesNotExistsException.class, () -> controller.getAllPredictions(authentication, 99L));
    }

    @Test
    void getAllPredictions_ReturnsDtos() {
        when(predictionService.getPredictionsBySignatureId(3L, 11L)).thenReturn(List.of(prediction("pred", PredictionStatus.PENDING)));

        assertEquals(1, controller.getAllPredictions(authentication, 11L).getBody().size());
    }

    @Test
    void handleInvalidSignatureSchemaException_ReturnsBadRequest() {
        when(request.getRequestURI()).thenReturn("/api/predictions");

        ResponseEntity<ErrorDto> response = controller.handleInvalidSignatureSchemaException(
                new InvalidSignatureSchemaException(
                        "Custom explanation kind \"old-kind\" does not exist in active plugin catalog."),
                request);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    }

    private Prediction prediction(String name, PredictionStatus status) {
        Model model = new Model();
        model.setId(1L);
        Signature signature = new Signature();
        signature.setId(11L);
        signature.setModel(model);
        Prediction prediction = new Prediction();
        prediction.setId(12L);
        prediction.setSignature(signature);
        prediction.setName(name);
        prediction.setPrediction(Map.of());
        prediction.setData(Map.of());
        prediction.setStatus(status);
        return prediction;
    }
}
