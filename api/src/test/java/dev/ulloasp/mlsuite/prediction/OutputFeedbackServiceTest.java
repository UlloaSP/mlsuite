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

import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.prediction.domain.model.OutputFeedback;
import dev.ulloasp.mlsuite.prediction.domain.model.Prediction;
import dev.ulloasp.mlsuite.prediction.domain.model.PredictionStatus;
import dev.ulloasp.mlsuite.prediction.domain.exception.OutputFeedbackDoesNotExistsException;
import dev.ulloasp.mlsuite.prediction.domain.exception.PredictionDoesNotExistsException;
import dev.ulloasp.mlsuite.prediction.adapter.out.persistence.repository.OutputFeedbackRepository;
import dev.ulloasp.mlsuite.prediction.adapter.out.persistence.repository.PredictionRepository;
import dev.ulloasp.mlsuite.prediction.application.service.OutputFeedbackServiceImpl;
import dev.ulloasp.mlsuite.prediction.application.service.PredictionFeedbackStatusResolver;
import dev.ulloasp.mlsuite.signature.domain.model.Signature;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.user.application.service.UserLookupService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;

@ExtendWith(MockitoExtension.class)
class OutputFeedbackServiceTest {

    @Mock
    private UserLookupService userLookupService;

    @Mock
    private OutputFeedbackRepository outputFeedbackRepository;

    @Mock
    private PredictionRepository predictionRepository;

    @Mock
    private PredictionFeedbackStatusResolver predictionFeedbackStatusResolver;

    @Mock
    private WorkspaceAccessService workspaceAccessService;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private OutputFeedbackServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new OutputFeedbackServiceImpl(
                userLookupService,
                outputFeedbackRepository,
                predictionRepository,
                predictionFeedbackStatusResolver,
                workspaceAccessService);
        when(workspaceAccessService.requireCurrentOrganization(3L)).thenReturn(organization());
    }

    @Test
    void createOutputFeedback_UsesOwnerScopedPrediction() throws Exception {
        Prediction prediction = prediction();
        when(userLookupService.requireById(3L)).thenReturn(user());
        when(predictionRepository.findByIdAndOrganizationId(11L, 41L)).thenReturn(Optional.of(prediction));
        when(outputFeedbackRepository.findByPredictionIdAndUserIdAndOrder(11L, 3L, 1))
                .thenReturn(Optional.empty());
        when(outputFeedbackRepository.save(any(OutputFeedback.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(predictionFeedbackStatusResolver.resolve(3L, prediction)).thenReturn(PredictionStatus.COMPLETED);
        when(predictionRepository.save(any(Prediction.class))).thenAnswer(invocation -> invocation.getArgument(0));

        OutputFeedback result = service.createOutputFeedback(
                3L,
                11L,
                1,
                objectMapper.valueToTree(Map.of("assessment", "correct")));

        assertEquals(1, result.getOrder());
        assertEquals(PredictionStatus.COMPLETED, prediction.getStatus());
    }

    @Test
    void createOutputFeedback_UpdatesExistingUserOrderInsteadOfDuplicating() throws Exception {
        Prediction prediction = prediction();
        OutputFeedback existing = outputFeedback(prediction);
        when(userLookupService.requireById(3L)).thenReturn(user());
        when(predictionRepository.findByIdAndOrganizationId(11L, 41L)).thenReturn(Optional.of(prediction));
        when(outputFeedbackRepository.findByPredictionIdAndUserIdAndOrder(11L, 3L, 1))
                .thenReturn(Optional.of(existing));
        when(outputFeedbackRepository.save(any(OutputFeedback.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(predictionFeedbackStatusResolver.resolve(3L, prediction)).thenReturn(PredictionStatus.COMPLETED);
        when(predictionRepository.save(any(Prediction.class))).thenAnswer(invocation -> invocation.getArgument(0));

        OutputFeedback result = service.createOutputFeedback(
                3L,
                11L,
                1,
                objectMapper.valueToTree(Map.of("assessment", "updated")));

        assertEquals(12L, result.getId());
        assertEquals("updated", result.getValue().get("assessment").asText());
    }

    @Test
    void createOutputFeedback_ThrowsWhenPredictionMissing() throws Exception {
        when(userLookupService.requireById(3L)).thenReturn(user());
        when(predictionRepository.findByIdAndOrganizationId(11L, 41L)).thenReturn(Optional.empty());

        assertThrows(PredictionDoesNotExistsException.class,
                () -> service.createOutputFeedback(
                        3L,
                        11L,
                        1,
                        objectMapper.valueToTree(Map.of("assessment", "correct"))));
    }

    @Test
    void updateOutputFeedback_StoresValueAndRecalculatesStatus() throws Exception {
        Prediction prediction = prediction();
        OutputFeedback outputFeedback = outputFeedback(prediction);
        when(userLookupService.requireById(3L)).thenReturn(user());
        when(outputFeedbackRepository.findByIdAndOrganizationId(12L, 41L)).thenReturn(Optional.of(outputFeedback));
        when(outputFeedbackRepository.save(any(OutputFeedback.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(predictionFeedbackStatusResolver.resolve(3L, prediction)).thenReturn(PredictionStatus.COMPLETED);
        when(predictionRepository.save(any(Prediction.class))).thenAnswer(invocation -> invocation.getArgument(0));

        OutputFeedback result = service.updateOutputFeedback(
                3L,
                12L,
                objectMapper.valueToTree(Map.of("assessment", "incorrect")));

        assertEquals("incorrect", result.getValue().get("assessment").asText());
        assertEquals(PredictionStatus.COMPLETED, prediction.getStatus());
    }

    @Test
    void updateOutputFeedback_ThrowsWhenOwnerScopedItemMissing() throws Exception {
        when(userLookupService.requireById(3L)).thenReturn(user());
        when(outputFeedbackRepository.findByIdAndOrganizationId(12L, 41L)).thenReturn(Optional.empty());

        assertThrows(OutputFeedbackDoesNotExistsException.class,
                () -> service.updateOutputFeedback(
                        3L,
                        12L,
                        objectMapper.valueToTree(Map.of("assessment", "incorrect"))));
    }

    @Test
    void getOutputFeedbackByPredictionId_ReturnsOrderedList() {
        when(userLookupService.requireById(3L)).thenReturn(user());
        when(predictionRepository.findByIdAndOrganizationId(11L, 41L)).thenReturn(Optional.of(prediction()));
        when(outputFeedbackRepository.findPublishedByPredictionIdAndOrganizationId(11L, 41L))
                .thenReturn(List.of(outputFeedback(prediction())));

        assertEquals(1, service.getOutputFeedbackByPredictionId(3L, 11L).size());
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
        model.setOrganization(organization());
        Signature signature = new Signature();
        signature.setModel(model);
        signature.setInputSignature(Map.of("reports", List.of(Map.of("kind", "classifier"))));
        Prediction prediction = new Prediction();
        prediction.setId(11L);
        prediction.setSignature(signature);
        prediction.setPrediction(Map.of());
        prediction.setData(Map.of());
        prediction.setStatus(PredictionStatus.PENDING);
        return prediction;
    }

    private OutputFeedback outputFeedback(Prediction prediction) {
        OutputFeedback outputFeedback = new OutputFeedback();
        outputFeedback.setId(12L);
        outputFeedback.setPrediction(prediction);
        outputFeedback.setOrder(1);
        outputFeedback.setValue(objectMapper.valueToTree(Map.of("assessment", "correct")));
        return outputFeedback;
    }

    private Organization organization() {
        Organization organization = new Organization();
        organization.setId(41L);
        organization.setName("Org");
        organization.setSlug("org");
        organization.setCreatedBy(user());
        return organization;
    }
}

