package dev.ulloasp.mlsuite.prediction;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.fasterxml.jackson.databind.ObjectMapper;

import dev.ulloasp.mlsuite.model.entities.Model;
import dev.ulloasp.mlsuite.prediction.entities.ExplanationFeedback;
import dev.ulloasp.mlsuite.prediction.entities.Prediction;
import dev.ulloasp.mlsuite.prediction.exceptions.ExplanationFeedbackDoesNotExistsException;
import dev.ulloasp.mlsuite.prediction.exceptions.PredictionDoesNotExistsException;
import dev.ulloasp.mlsuite.prediction.repositories.ExplanationFeedbackRepository;
import dev.ulloasp.mlsuite.prediction.repositories.PredictionRepository;
import dev.ulloasp.mlsuite.prediction.services.ExplanationFeedbackServiceImpl;
import dev.ulloasp.mlsuite.signature.entities.Signature;
import dev.ulloasp.mlsuite.user.entity.User;
import dev.ulloasp.mlsuite.user.service.UserLookupService;

@ExtendWith(MockitoExtension.class)
class ExplanationFeedbackServiceTest {

    @Mock
    private UserLookupService userLookupService;

    @Mock
    private ExplanationFeedbackRepository explanationFeedbackRepository;

    @Mock
    private PredictionRepository predictionRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private ExplanationFeedbackServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new ExplanationFeedbackServiceImpl(userLookupService, explanationFeedbackRepository,
                predictionRepository);
    }

    @Test
    void createExplanationFeedback_UsesOwnerScopedPrediction() throws Exception {
        when(userLookupService.requireById(3L)).thenReturn(user());
        when(predictionRepository.findByIdAndUserId(11L, 3L)).thenReturn(Optional.of(prediction()));
        when(explanationFeedbackRepository.save(any(ExplanationFeedback.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        ExplanationFeedback result = service.createExplanationFeedback(3L, 11L, 1, objectMapper.readTree("\"tree\""));

        assertEquals(1, result.getOrder());
        assertEquals("tree", result.getValue().asText());
    }

    @Test
    void createExplanationFeedback_ThrowsWhenPredictionMissing() throws Exception {
        when(userLookupService.requireById(3L)).thenReturn(user());
        when(predictionRepository.findByIdAndUserId(11L, 3L)).thenReturn(Optional.empty());

        assertThrows(PredictionDoesNotExistsException.class,
                () -> service.createExplanationFeedback(3L, 11L, 1, objectMapper.readTree("\"tree\"")));
    }

    @Test
    void updateExplanationFeedback_StoresRealValue() throws Exception {
        ExplanationFeedback feedback = explanationFeedback(prediction());
        when(userLookupService.requireById(3L)).thenReturn(user());
        when(explanationFeedbackRepository.findByIdAndUserId(12L, 3L)).thenReturn(Optional.of(feedback));
        when(explanationFeedbackRepository.save(any(ExplanationFeedback.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        ExplanationFeedback result = service.updateExplanationFeedback(3L, 12L, objectMapper.readTree("\"fixed\""));

        assertEquals("fixed", result.getRealValue().asText());
    }

    @Test
    void updateExplanationFeedback_ThrowsWhenOwnerScopedItemMissing() throws Exception {
        when(userLookupService.requireById(3L)).thenReturn(user());
        when(explanationFeedbackRepository.findByIdAndUserId(12L, 3L)).thenReturn(Optional.empty());

        assertThrows(ExplanationFeedbackDoesNotExistsException.class,
                () -> service.updateExplanationFeedback(3L, 12L, objectMapper.readTree("\"fixed\"")));
    }

    @Test
    void getExplanationFeedbackByPredictionId_ReturnsOrderedList() {
        when(userLookupService.requireById(3L)).thenReturn(user());
        when(predictionRepository.findByIdAndUserId(11L, 3L)).thenReturn(Optional.of(prediction()));
        when(explanationFeedbackRepository.findByPredictionIdAndUserId(11L, 3L))
                .thenReturn(List.of(explanationFeedback(prediction())));

        assertEquals(1, service.getExplanationFeedbackByPredictionId(3L, 11L).size());
    }

    private User user() {
        User user = new User();
        user.setId(3L);
        user.setUsername("alice");
        return user;
    }

    private Prediction prediction() {
        Model model = new Model();
        model.setUser(user());
        Signature signature = new Signature();
        signature.setModel(model);
        Prediction prediction = new Prediction();
        prediction.setId(11L);
        prediction.setSignature(signature);
        prediction.setPrediction(Map.of());
        prediction.setData(Map.of());
        return prediction;
    }

    private ExplanationFeedback explanationFeedback(Prediction prediction) {
        ExplanationFeedback explanationFeedback = new ExplanationFeedback();
        explanationFeedback.setId(12L);
        explanationFeedback.setPrediction(prediction);
        explanationFeedback.setOrder(1);
        explanationFeedback.setValue(objectMapper.valueToTree("tree"));
        return explanationFeedback;
    }
}
