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
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;

import com.fasterxml.jackson.databind.ObjectMapper;

import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.prediction.adapter.in.web.TargetControllerImpl;
import dev.ulloasp.mlsuite.prediction.application.dto.CreateTargetParams;
import dev.ulloasp.mlsuite.prediction.application.dto.UpdateTargetParams;
import dev.ulloasp.mlsuite.prediction.application.port.in.TargetCatalogUseCase;
import dev.ulloasp.mlsuite.prediction.domain.model.Prediction;
import dev.ulloasp.mlsuite.prediction.domain.model.Target;
import dev.ulloasp.mlsuite.prediction.domain.exception.TargetDoesNotExistsException;
import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import dev.ulloasp.mlsuite.security.identity.CurrentUserResolver;
import dev.ulloasp.mlsuite.signature.domain.model.Signature;

@ExtendWith(MockitoExtension.class)
class TargetControllerTest {

    @Mock
    private CurrentUserResolver currentUserResolver;

    @Mock
    private TargetCatalogUseCase targetCatalogUseCase;

    @Mock
    private OAuth2AuthenticationToken authentication;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private TargetControllerImpl controller;

    @BeforeEach
    void setUp() {
        controller = new TargetControllerImpl(currentUserResolver, targetCatalogUseCase);
        when(currentUserResolver.resolve(authentication)).thenReturn(new CurrentUser(3L, "alice"));
    }

    @Test
    void createTarget_UsesInternalUserId() throws Exception {
        CreateTargetParams params = new CreateTargetParams(11L, 1, objectMapper.readTree("{\"x\":1}"));
        when(targetCatalogUseCase.createTarget(3L, 11L, 1, params.value()))
                .thenReturn(target(params.value()));

        ResponseEntity<?> response = controller.createTarget(authentication, params);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        verify(targetCatalogUseCase).createTarget(3L, 11L, 1, params.value());
    }

    @Test
    void updateTarget_UsesInternalUserId() throws Exception {
        UpdateTargetParams params = new UpdateTargetParams(12L, objectMapper.readTree("{\"actual\":1}"));
        when(targetCatalogUseCase.updateTarget(3L, 12L, params.realValue()))
                .thenReturn(target(params.realValue()));

        ResponseEntity<?> response = controller.updateTarget(authentication, params);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        verify(targetCatalogUseCase).updateTarget(3L, 12L, params.realValue());
    }

    @Test
    void getAllTargets_PropagatesMissingTargetErrors() {
        when(targetCatalogUseCase.getTargetsByPredictionId(3L, 99L)).thenThrow(new TargetDoesNotExistsException(99L, "alice"));

        assertThrows(TargetDoesNotExistsException.class, () -> controller.getAllTargets(authentication, 99L));
    }

    @Test
    void getAllTargets_ReturnsDtos() {
        when(targetCatalogUseCase.getTargetsByPredictionId(3L, 11L)).thenReturn(List.of(target(null)));

        assertEquals(1, controller.getAllTargets(authentication, 11L).getBody().size());
    }

    private Target target(com.fasterxml.jackson.databind.JsonNode realValue) {
        Model model = new Model();
        model.setId(1L);
        Signature signature = new Signature();
        signature.setModel(model);
        Prediction prediction = new Prediction();
        prediction.setId(11L);
        prediction.setSignature(signature);
        prediction.setPrediction(Map.of());
        prediction.setData(Map.of());
        Target target = new Target();
        target.setId(12L);
        target.setPrediction(prediction);
        target.setOrder(1);
        target.setValue(realValue);
        target.setRealValue(realValue);
        return target;
    }
}

