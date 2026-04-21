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
import dev.ulloasp.mlsuite.prediction.entities.Prediction;
import dev.ulloasp.mlsuite.prediction.entities.Target;
import dev.ulloasp.mlsuite.prediction.exceptions.PredictionDoesNotExistsException;
import dev.ulloasp.mlsuite.prediction.exceptions.TargetDoesNotExistsException;
import dev.ulloasp.mlsuite.prediction.repositories.PredictionRepository;
import dev.ulloasp.mlsuite.prediction.repositories.TargetRepository;
import dev.ulloasp.mlsuite.prediction.services.TargetServiceImpl;
import dev.ulloasp.mlsuite.signature.entities.Signature;
import dev.ulloasp.mlsuite.user.entity.User;
import dev.ulloasp.mlsuite.user.service.UserLookupService;

@ExtendWith(MockitoExtension.class)
class TargetServiceTest {

    @Mock
    private UserLookupService userLookupService;

    @Mock
    private TargetRepository targetRepository;

    @Mock
    private PredictionRepository predictionRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private TargetServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new TargetServiceImpl(userLookupService, targetRepository, predictionRepository);
    }

    @Test
    void createTarget_UsesOwnerScopedPrediction() throws Exception {
        when(userLookupService.requireById(3L)).thenReturn(user());
        when(predictionRepository.findByIdAndUserId(11L, 3L)).thenReturn(Optional.of(prediction()));
        when(targetRepository.save(any(Target.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Target result = service.createTarget(3L, 11L, 1, objectMapper.readTree("{\"x\":1}"));

        assertEquals(1, result.getOrder());
    }

    @Test
    void createTarget_ThrowsWhenPredictionMissing() throws Exception {
        when(userLookupService.requireById(3L)).thenReturn(user());
        when(predictionRepository.findByIdAndUserId(11L, 3L)).thenReturn(Optional.empty());

        assertThrows(PredictionDoesNotExistsException.class,
                () -> service.createTarget(3L, 11L, 1, objectMapper.readTree("{\"x\":1}")));
    }

    @Test
    void updateTarget_ThrowsWhenOwnerScopedTargetMissing() throws Exception {
        when(userLookupService.requireById(3L)).thenReturn(user());
        when(targetRepository.findByIdAndUserId(12L, 3L)).thenReturn(Optional.empty());

        assertThrows(TargetDoesNotExistsException.class,
                () -> service.updateTarget(3L, 12L, objectMapper.readTree("{\"actual\":1}")));
    }

    @Test
    void getTargetsByPredictionId_ReturnsOwnerScopedList() {
        when(userLookupService.requireById(3L)).thenReturn(user());
        when(predictionRepository.findByIdAndUserId(11L, 3L)).thenReturn(Optional.of(prediction()));
        when(targetRepository.findByPredictionIdAndUserId(11L, 3L)).thenReturn(List.of(new Target()));

        assertEquals(1, service.getTargetsByPredictionId(3L, 11L).size());
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
}
