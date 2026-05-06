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
import org.springframework.security.core.Authentication;

import com.fasterxml.jackson.databind.ObjectMapper;

import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.prediction.adapter.in.web.OutputFeedbackControllerImpl;
import dev.ulloasp.mlsuite.prediction.application.dto.CreateOutputFeedbackParams;
import dev.ulloasp.mlsuite.prediction.application.dto.UpdateOutputFeedbackParams;
import dev.ulloasp.mlsuite.prediction.application.port.in.OutputFeedbackCatalogUseCase;
import dev.ulloasp.mlsuite.prediction.domain.model.OutputFeedback;
import dev.ulloasp.mlsuite.prediction.domain.model.Prediction;
import dev.ulloasp.mlsuite.prediction.domain.exception.OutputFeedbackDoesNotExistsException;
import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import dev.ulloasp.mlsuite.security.identity.CurrentUserResolver;
import dev.ulloasp.mlsuite.signature.domain.model.Signature;

@ExtendWith(MockitoExtension.class)
class OutputFeedbackControllerTest {

    @Mock
    private CurrentUserResolver currentUserResolver;

    @Mock
    private OutputFeedbackCatalogUseCase outputFeedbackCatalogUseCase;

    @Mock
    private Authentication authentication;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private OutputFeedbackControllerImpl controller;

    @BeforeEach
    void setUp() {
        controller = new OutputFeedbackControllerImpl(currentUserResolver, outputFeedbackCatalogUseCase);
        when(currentUserResolver.resolve(authentication)).thenReturn(new CurrentUser(3L, "alice", dev.ulloasp.mlsuite.user.domain.model.SystemRole.USER));
    }

    @Test
    void createOutputFeedback_UsesInternalUserId() throws Exception {
        CreateOutputFeedbackParams params = new CreateOutputFeedbackParams(
                11L,
                1,
                objectMapper.valueToTree(Map.of("assessment", "correct")));
        when(outputFeedbackCatalogUseCase.createOutputFeedback(3L, 11L, 1, params.value()))
                .thenReturn(outputFeedback(params.value()));

        ResponseEntity<?> response = controller.createOutputFeedback(authentication, params);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        verify(outputFeedbackCatalogUseCase).createOutputFeedback(3L, 11L, 1, params.value());
    }

    @Test
    void updateOutputFeedback_UsesInternalUserId() throws Exception {
        UpdateOutputFeedbackParams params = new UpdateOutputFeedbackParams(
                12L,
                objectMapper.valueToTree(Map.of("assessment", "incorrect")));
        when(outputFeedbackCatalogUseCase.updateOutputFeedback(3L, 12L, params.value()))
                .thenReturn(outputFeedback(params.value()));

        ResponseEntity<?> response = controller.updateOutputFeedback(authentication, params);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        verify(outputFeedbackCatalogUseCase).updateOutputFeedback(3L, 12L, params.value());
    }

    @Test
    void getAllOutputFeedback_PropagatesMissingErrors() {
        when(outputFeedbackCatalogUseCase.getOutputFeedbackByPredictionId(3L, 99L))
                .thenThrow(new OutputFeedbackDoesNotExistsException(99L, "alice"));

        assertThrows(OutputFeedbackDoesNotExistsException.class,
                () -> controller.getAllOutputFeedback(authentication, 99L));
    }

    @Test
    void getAllOutputFeedback_ReturnsDtos() throws Exception {
        when(outputFeedbackCatalogUseCase.getOutputFeedbackByPredictionId(3L, 11L))
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

