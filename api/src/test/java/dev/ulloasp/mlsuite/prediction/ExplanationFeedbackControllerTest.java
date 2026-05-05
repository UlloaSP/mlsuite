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
import dev.ulloasp.mlsuite.prediction.adapter.in.web.ExplanationFeedbackControllerImpl;
import dev.ulloasp.mlsuite.prediction.application.dto.CreateExplanationFeedbackParams;
import dev.ulloasp.mlsuite.prediction.application.dto.UpdateExplanationFeedbackParams;
import dev.ulloasp.mlsuite.prediction.application.port.in.ExplanationFeedbackCatalogUseCase;
import dev.ulloasp.mlsuite.prediction.domain.model.ExplanationFeedback;
import dev.ulloasp.mlsuite.prediction.domain.model.Prediction;
import dev.ulloasp.mlsuite.prediction.domain.exception.ExplanationFeedbackDoesNotExistsException;
import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import dev.ulloasp.mlsuite.security.identity.CurrentUserResolver;
import dev.ulloasp.mlsuite.signature.domain.model.Signature;

@ExtendWith(MockitoExtension.class)
class ExplanationFeedbackControllerTest {

    @Mock
    private CurrentUserResolver currentUserResolver;

    @Mock
    private ExplanationFeedbackCatalogUseCase explanationFeedbackCatalogUseCase;

    @Mock
    private Authentication authentication;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private ExplanationFeedbackControllerImpl controller;

    @BeforeEach
    void setUp() {
        controller = new ExplanationFeedbackControllerImpl(currentUserResolver, explanationFeedbackCatalogUseCase);
        when(currentUserResolver.resolve(authentication)).thenReturn(new CurrentUser(3L, "alice", dev.ulloasp.mlsuite.user.domain.model.SystemRole.USER));
    }

    @Test
    void createExplanationFeedback_UsesInternalUserId() throws Exception {
        CreateExplanationFeedbackParams params = new CreateExplanationFeedbackParams(
                11L,
                1,
                objectMapper.valueToTree(Map.of("feedback-step-notes", "tree")));
        when(explanationFeedbackCatalogUseCase.createExplanationFeedback(3L, 11L, 1, params.value()))
                .thenReturn(explanationFeedback(params.value()));

        ResponseEntity<?> response = controller.createExplanationFeedback(authentication, params);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        verify(explanationFeedbackCatalogUseCase).createExplanationFeedback(3L, 11L, 1, params.value());
    }

    @Test
    void updateExplanationFeedback_UsesInternalUserId() throws Exception {
        UpdateExplanationFeedbackParams params = new UpdateExplanationFeedbackParams(
                12L,
                objectMapper.valueToTree(Map.of("feedback-step-notes", "fixed")));
        when(explanationFeedbackCatalogUseCase.updateExplanationFeedback(3L, 12L, params.realValue()))
                .thenReturn(explanationFeedback(params.realValue()));

        ResponseEntity<?> response = controller.updateExplanationFeedback(authentication, params);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        verify(explanationFeedbackCatalogUseCase).updateExplanationFeedback(3L, 12L, params.realValue());
    }

    @Test
    void getAllExplanationFeedback_PropagatesMissingErrors() {
        when(explanationFeedbackCatalogUseCase.getExplanationFeedbackByPredictionId(3L, 99L))
                .thenThrow(new ExplanationFeedbackDoesNotExistsException(99L, "alice"));

        assertThrows(ExplanationFeedbackDoesNotExistsException.class,
                () -> controller.getAllExplanationFeedback(authentication, 99L));
    }

    @Test
    void getAllExplanationFeedback_ReturnsDtos() {
        when(explanationFeedbackCatalogUseCase.getExplanationFeedbackByPredictionId(3L, 11L))
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

