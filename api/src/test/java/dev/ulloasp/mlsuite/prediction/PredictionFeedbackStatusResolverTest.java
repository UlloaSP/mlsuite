package dev.ulloasp.mlsuite.prediction;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import dev.ulloasp.mlsuite.prediction.adapter.out.persistence.repository.ExplanationFeedbackRepository;
import dev.ulloasp.mlsuite.prediction.adapter.out.persistence.repository.OutputFeedbackRepository;
import dev.ulloasp.mlsuite.prediction.application.service.PredictionFeedbackStatusResolver;
import dev.ulloasp.mlsuite.prediction.domain.model.ExplanationFeedback;
import dev.ulloasp.mlsuite.prediction.domain.model.OutputFeedback;
import dev.ulloasp.mlsuite.prediction.domain.model.Prediction;
import dev.ulloasp.mlsuite.prediction.domain.model.PredictionStatus;
import dev.ulloasp.mlsuite.signature.domain.model.Signature;

@ExtendWith(MockitoExtension.class)
class PredictionFeedbackStatusResolverTest {

    @Mock
    private OutputFeedbackRepository outputFeedbackRepository;

    @Mock
    private ExplanationFeedbackRepository explanationFeedbackRepository;

    private PredictionFeedbackStatusResolver resolver;

    @BeforeEach
    void setUp() {
        resolver = new PredictionFeedbackStatusResolver(outputFeedbackRepository, explanationFeedbackRepository);
    }

    @Test
    void resolve_RequiresPersistedExplanationQuestionnaireMetadata() {
        Prediction prediction = prediction(inputSignature(
                List.of(Map.of("kind", "output")),
                List.of(Map.of("kind", "Crystal Tree", "feedbackQuestionnaire", Map.of("steps", List.of())))));
        when(outputFeedbackRepository.findByPredictionIdAndUserId(12L, 3L)).thenReturn(List.of(new OutputFeedback()));
        when(explanationFeedbackRepository.findByPredictionIdAndUserId(12L, 3L)).thenReturn(List.of());

        assertEquals(PredictionStatus.PENDING, resolver.resolve(3L, prediction));
    }

    @Test
    void resolve_CompletesWhenPersistedFeedbackRequirementsAreSaved() {
        Prediction prediction = prediction(inputSignature(
                List.of(Map.of("kind", "output")),
                List.of(Map.of("kind", "Crystal Tree", "feedbackEnabled", true))));
        when(outputFeedbackRepository.findByPredictionIdAndUserId(12L, 3L)).thenReturn(List.of(new OutputFeedback()));
        when(explanationFeedbackRepository.findByPredictionIdAndUserId(12L, 3L))
                .thenReturn(List.of(new ExplanationFeedback()));

        assertEquals(PredictionStatus.COMPLETED, resolver.resolve(3L, prediction));
    }

    private Prediction prediction(Map<String, Object> inputSignature) {
        Signature signature = new Signature();
        signature.setInputSignature(inputSignature);
        Prediction prediction = new Prediction();
        prediction.setId(12L);
        prediction.setSignature(signature);
        return prediction;
    }

    private Map<String, Object> inputSignature(List<Map<String, Object>> reports, List<Map<String, Object>> explanations) {
        return Map.of("reports", reports, "explanations", explanations);
    }
}
