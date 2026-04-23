package dev.ulloasp.mlsuite.prediction;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import dev.ulloasp.mlsuite.model.entities.Model;
import dev.ulloasp.mlsuite.prediction.entities.Prediction;
import dev.ulloasp.mlsuite.prediction.entities.PredictionStatus;
import dev.ulloasp.mlsuite.prediction.exceptions.PredictionDoesNotExistsException;
import dev.ulloasp.mlsuite.prediction.repositories.ExplanationFeedbackRepository;
import dev.ulloasp.mlsuite.prediction.repositories.PredictionRepository;
import dev.ulloasp.mlsuite.prediction.repositories.TargetRepository;
import dev.ulloasp.mlsuite.prediction.services.PredictionServiceImpl;
import dev.ulloasp.mlsuite.signature.entities.Signature;
import dev.ulloasp.mlsuite.signature.exceptions.InvalidSignatureSchemaException;
import dev.ulloasp.mlsuite.signature.exceptions.SignatureDoesNotExistsException;
import dev.ulloasp.mlsuite.signature.repositories.SignatureRepository;
import dev.ulloasp.mlsuite.signature.services.SignatureSchemaCompatibilityService;
import dev.ulloasp.mlsuite.user.entity.User;
import dev.ulloasp.mlsuite.user.service.UserLookupService;

@ExtendWith(MockitoExtension.class)
class PredictionServiceTest {

    @Mock
    private UserLookupService userLookupService;

    @Mock
    private SignatureRepository signatureRepository;

    @Mock
    private PredictionRepository predictionRepository;

    @Mock
    private TargetRepository targetRepository;

    @Mock
    private ExplanationFeedbackRepository explanationFeedbackRepository;

    @Mock
    private SignatureSchemaCompatibilityService signatureSchemaCompatibilityService;

    private PredictionServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new PredictionServiceImpl(userLookupService, signatureRepository, predictionRepository,
                targetRepository,
                explanationFeedbackRepository,
                signatureSchemaCompatibilityService);
    }

    @Test
    void createPrediction_UsesInternalUserId() {
        User user = user(3L);
        Signature signature = signature(user);
        signature.setInputSignature(Map.of("fields", List.of()));
        when(userLookupService.requireById(3L)).thenReturn(user);
        when(signatureRepository.findByIdAndUserId(11L, 3L)).thenReturn(Optional.of(signature));
        when(predictionRepository.findBySignatureIdAndName(11L, "pred")).thenReturn(Optional.empty());
        when(predictionRepository.save(any(Prediction.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Prediction result = service.createPrediction(3L, 11L, "pred", false, Map.of("value", 1), Map.of("x", 2));

        assertEquals("pred", result.getName());
        verify(signatureRepository).findByIdAndUserId(11L, 3L);
    }

    @Test
    void createPrediction_ThrowsWhenSchemaCompatibilityFails() {
        User user = user(3L);
        Signature signature = signature(user);
        signature.setInputSignature(Map.of("explanations", List.of(Map.of("kind", "old-kind"))));
        when(userLookupService.requireById(3L)).thenReturn(user);
        when(signatureRepository.findByIdAndUserId(11L, 3L)).thenReturn(Optional.of(signature));
        doThrow(new InvalidSignatureSchemaException(
                "Custom explanation kind \"old-kind\" does not exist in active plugin catalog."))
                .when(signatureSchemaCompatibilityService).validate(3L, signature.getInputSignature());

        assertThrows(InvalidSignatureSchemaException.class,
                () -> service.createPrediction(3L, 11L, "pred", false, Map.of(), Map.of()));
    }

    @Test
    void createPrediction_ThrowsWhenSignatureMissing() {
        when(userLookupService.requireById(3L)).thenReturn(user(3L));
        when(signatureRepository.findByIdAndUserId(11L, 3L)).thenReturn(Optional.empty());

        assertThrows(SignatureDoesNotExistsException.class,
                () -> service.createPrediction(3L, 11L, "pred", false, Map.of(), Map.of()));
    }

    @Test
    void createPrediction_OverwritesExistingPredictionWhenRequested() {
        User user = user(3L);
        Signature signature = signature(user);
        Prediction storedPrediction = prediction(signature);
        storedPrediction.setData(Map.of("old", 1));
        storedPrediction.setPrediction(Map.of("old", 2));
        signature.setInputSignature(Map.of("fields", List.of()));
        when(userLookupService.requireById(3L)).thenReturn(user);
        when(signatureRepository.findByIdAndUserId(11L, 3L)).thenReturn(Optional.of(signature));
        when(predictionRepository.findBySignatureIdAndName(11L, "pred")).thenReturn(Optional.of(storedPrediction));
        when(predictionRepository.save(any(Prediction.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Prediction result = service.createPrediction(3L, 11L, "pred", true, Map.of("value", 1), Map.of("x", 2));

        assertEquals(Map.of("x", 2), result.getData());
        assertEquals(Map.of("value", 1), result.getPrediction());
        assertEquals(PredictionStatus.PENDING, result.getStatus());
        verify(targetRepository).deleteByPredictionId(12L);
        verify(explanationFeedbackRepository).deleteByPredictionId(12L);
    }

    @Test
    void updatePrediction_UsesOwnerScopedLookup() {
        when(userLookupService.requireById(3L)).thenReturn(user(3L));
        when(predictionRepository.findByIdAndUserId(12L, 3L)).thenReturn(Optional.of(prediction(signature(user(3L)))));
        when(predictionRepository.save(any(Prediction.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Prediction result = service.updatePrediction(3L, 12L, PredictionStatus.SUCCESS);

        assertEquals(PredictionStatus.SUCCESS, result.getStatus());
    }

    @Test
    void getPredictionsBySignatureId_ThrowsWhenMissing() {
        when(userLookupService.requireById(3L)).thenReturn(user(3L));
        when(signatureRepository.findByIdAndUserId(99L, 3L)).thenReturn(Optional.empty());

        assertThrows(SignatureDoesNotExistsException.class, () -> service.getPredictionsBySignatureId(3L, 99L));
    }

    @Test
    void getPredictionsBySignatureId_ReturnsOwnerScopedList() {
        when(userLookupService.requireById(3L)).thenReturn(user(3L));
        when(signatureRepository.findByIdAndUserId(11L, 3L)).thenReturn(Optional.of(signature(user(3L))));
        when(predictionRepository.findBySignatureIdAndUserId(11L, 3L)).thenReturn(List.of(prediction(signature(user(3L)))));

        assertEquals(1, service.getPredictionsBySignatureId(3L, 11L).size());
    }

    private User user(Long id) {
        User user = new User();
        user.setId(id);
        user.setUsername("alice");
        return user;
    }

    private Signature signature(User user) {
        Model model = new Model();
        model.setUser(user);
        Signature signature = new Signature();
        signature.setId(11L);
        signature.setModel(model);
        signature.setName("sig");
        return signature;
    }

    private Prediction prediction(Signature signature) {
        Prediction prediction = new Prediction();
        prediction.setId(12L);
        prediction.setSignature(signature);
        prediction.setName("pred");
        prediction.setPrediction(Map.of());
        prediction.setData(Map.of());
        prediction.setStatus(PredictionStatus.PENDING);
        return prediction;
    }
}
