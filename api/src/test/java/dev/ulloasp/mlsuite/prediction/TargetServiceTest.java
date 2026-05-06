package dev.ulloasp.mlsuite.prediction;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
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
import dev.ulloasp.mlsuite.prediction.domain.model.Prediction;
import dev.ulloasp.mlsuite.prediction.domain.model.PredictionStatus;
import dev.ulloasp.mlsuite.prediction.domain.model.Target;
import dev.ulloasp.mlsuite.prediction.domain.exception.PredictionDoesNotExistsException;
import dev.ulloasp.mlsuite.prediction.domain.exception.TargetDoesNotExistsException;
import dev.ulloasp.mlsuite.prediction.adapter.out.persistence.repository.PredictionRepository;
import dev.ulloasp.mlsuite.prediction.adapter.out.persistence.repository.TargetRepository;
import dev.ulloasp.mlsuite.prediction.application.service.TargetServiceImpl;
import dev.ulloasp.mlsuite.signature.domain.model.Signature;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.user.application.service.UserLookupService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;

@ExtendWith(MockitoExtension.class)
class TargetServiceTest {

    @Mock
    private UserLookupService userLookupService;

    @Mock
    private TargetRepository targetRepository;

    @Mock
    private PredictionRepository predictionRepository;

    @Mock
    private WorkspaceAccessService workspaceAccessService;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private TargetServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new TargetServiceImpl(userLookupService, targetRepository, predictionRepository, workspaceAccessService);
        when(workspaceAccessService.requireCurrentOrganization(3L)).thenReturn(organization());
    }

    @Test
    void createTarget_UsesOwnerScopedPrediction() throws Exception {
        when(userLookupService.requireById(3L)).thenReturn(user());
        when(predictionRepository.findByIdAndOrganizationId(11L, 41L)).thenReturn(Optional.of(prediction()));
        when(targetRepository.save(any(Target.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Target result = service.createTarget(3L, 11L, 1, objectMapper.readTree("{\"x\":1}"));

        assertEquals(1, result.getOrder());
        assertNull(result.getRealValue());
    }

    @Test
    void createTarget_ThrowsWhenPredictionMissing() throws Exception {
        when(userLookupService.requireById(3L)).thenReturn(user());
        when(predictionRepository.findByIdAndOrganizationId(11L, 41L)).thenReturn(Optional.empty());

        assertThrows(PredictionDoesNotExistsException.class,
                () -> service.createTarget(3L, 11L, 1, objectMapper.readTree("{\"x\":1}")));
    }

    @Test
    void updateTarget_ThrowsWhenOwnerScopedTargetMissing() throws Exception {
        when(userLookupService.requireById(3L)).thenReturn(user());
        when(targetRepository.findByIdAndOrganizationId(12L, 41L)).thenReturn(Optional.empty());

        assertThrows(TargetDoesNotExistsException.class,
                () -> service.updateTarget(3L, 12L, objectMapper.readTree("{\"actual\":1}")));
    }

    @Test
    void updateTarget_StoresRealValueOnly() throws Exception {
        Target target = target();
        when(userLookupService.requireById(3L)).thenReturn(user());
        when(targetRepository.findByIdAndOrganizationId(12L, 41L)).thenReturn(Optional.of(target));
        when(targetRepository.save(any(Target.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Target result = service.updateTarget(3L, 12L, objectMapper.readTree("{\"actual\":1}"));

        assertEquals("{\"actual\":1}", result.getRealValue().toString());
        assertEquals(PredictionStatus.PENDING, result.getPrediction().getStatus());
    }

    @Test
    void getTargetsByPredictionId_ReturnsOwnerScopedList() {
        when(userLookupService.requireById(3L)).thenReturn(user());
        when(predictionRepository.findByIdAndOrganizationId(11L, 41L)).thenReturn(Optional.of(prediction()));
        when(targetRepository.findByPredictionIdAndOrganizationId(11L, 41L)).thenReturn(List.of(new Target()));

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
        model.setOrganization(organization());
        Signature signature = new Signature();
        signature.setModel(model);
        Prediction prediction = new Prediction();
        prediction.setId(11L);
        prediction.setSignature(signature);
        prediction.setPrediction(Map.of());
        prediction.setData(Map.of());
        prediction.setStatus(PredictionStatus.PENDING);
        return prediction;
    }

    private Target target() {
        Target target = new Target();
        target.setId(12L);
        target.setPrediction(prediction());
        return target;
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

