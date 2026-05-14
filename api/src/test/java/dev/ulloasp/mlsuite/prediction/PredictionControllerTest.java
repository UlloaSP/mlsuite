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
import org.springframework.security.core.Authentication;

import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.prediction.adapter.in.web.PredictionControllerImpl;
import dev.ulloasp.mlsuite.prediction.application.dto.CreatePredictionParams;
import dev.ulloasp.mlsuite.prediction.application.dto.UpdatePredictionParams;
import dev.ulloasp.mlsuite.prediction.application.port.in.PredictionCatalogUseCase;
import dev.ulloasp.mlsuite.prediction.domain.model.Prediction;
import dev.ulloasp.mlsuite.prediction.domain.model.PredictionStatus;
import dev.ulloasp.mlsuite.prediction.domain.exception.PredictionDoesNotExistsException;
import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import dev.ulloasp.mlsuite.security.identity.CurrentUserResolver;
import dev.ulloasp.mlsuite.signature.domain.model.Signature;

@ExtendWith(MockitoExtension.class)
class PredictionControllerTest {

    @Mock
    private CurrentUserResolver currentUserResolver;

    @Mock
    private PredictionCatalogUseCase predictionCatalogUseCase;

    @Mock
    private Authentication authentication;

    private PredictionControllerImpl controller;

    @BeforeEach
    void setUp() {
        controller = new PredictionControllerImpl(currentUserResolver, predictionCatalogUseCase);
        lenient().when(currentUserResolver.resolve(authentication)).thenReturn(new CurrentUser(3L, "alice", dev.ulloasp.mlsuite.user.domain.model.SystemRole.USER));
    }

    @Test
    void createPrediction_UsesInternalUserId() {
        CreatePredictionParams params = new CreatePredictionParams(11L, "pred", true, Map.of("x", 2), Map.of("value", 1));
        when(predictionCatalogUseCase.createPrediction(3L, 11L, "pred", true, Map.of("value", 1), Map.of("x", 2)))
                .thenReturn(prediction("pred", PredictionStatus.PENDING));

        ResponseEntity<?> response = controller.createPrediction(authentication, params);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        verify(predictionCatalogUseCase).createPrediction(3L, 11L, "pred", true, Map.of("value", 1), Map.of("x", 2));
    }

    @Test
    void updatePrediction_UsesInternalUserId() {
        UpdatePredictionParams params = new UpdatePredictionParams(12L, "COMPLETED");
        when(predictionCatalogUseCase.updatePrediction(3L, 12L, PredictionStatus.COMPLETED))
                .thenReturn(prediction("pred", PredictionStatus.COMPLETED));

        ResponseEntity<?> response = controller.updatePrediction(authentication, params);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        verify(predictionCatalogUseCase).updatePrediction(3L, 12L, PredictionStatus.COMPLETED);
    }

    @Test
    void getAllPredictions_PropagatesMissingPredictionErrors() {
        when(predictionCatalogUseCase.getPredictionsBySignatureId(3L, 99L))
                .thenThrow(new PredictionDoesNotExistsException(99L, "alice"));

        assertThrows(PredictionDoesNotExistsException.class, () -> controller.getAllPredictions(authentication, 99L));
    }

    @Test
    void getAllPredictions_ReturnsDtos() {
        when(predictionCatalogUseCase.getPredictionsBySignatureId(3L, 11L))
                .thenReturn(List.of(prediction("pred", PredictionStatus.PENDING)));

        assertEquals(1, controller.getAllPredictions(authentication, 11L).getBody().size());
    }

    @Test
    void getLastPredictionId_ReturnsSequenceDto() {
        when(predictionCatalogUseCase.getLastPredictionId(3L)).thenReturn(42L);

        assertEquals(42L, controller.getLastPredictionId(authentication).getBody().lastId());
        verify(predictionCatalogUseCase).getLastPredictionId(3L);
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

