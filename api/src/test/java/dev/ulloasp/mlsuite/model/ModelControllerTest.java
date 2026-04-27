package dev.ulloasp.mlsuite.model;

import static org.junit.jupiter.api.Assertions.assertEquals;
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
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;

import dev.ulloasp.mlsuite.model.controllers.ModelControllerImpl;
import dev.ulloasp.mlsuite.model.entities.Model;
import dev.ulloasp.mlsuite.model.services.AnalyzerService;
import dev.ulloasp.mlsuite.model.services.ModelService;
import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import dev.ulloasp.mlsuite.security.identity.CurrentUserResolver;
import dev.ulloasp.mlsuite.signature.entities.Signature;
import dev.ulloasp.mlsuite.signature.services.SignatureService;

@ExtendWith(MockitoExtension.class)
class ModelControllerTest {

    @Mock
    private CurrentUserResolver currentUserResolver;

    @Mock
    private ModelService modelService;

    @Mock
    private SignatureService signatureService;

    @Mock
    private AnalyzerService analyzerService;

    @Mock
    private OAuth2AuthenticationToken authentication;

    private ModelControllerImpl controller;

    @BeforeEach
    void setUp() {
        controller = new ModelControllerImpl(currentUserResolver, modelService, signatureService, analyzerService);
        when(currentUserResolver.resolve(authentication)).thenReturn(new CurrentUser(4L, "alice"));
    }

    @Test
    void createModel_UsesInternalUserIdEverywhere() {
        MockMultipartFile modelFile = new MockMultipartFile("model", "model.pkl", "application/octet-stream", "x".getBytes());
        Model model = new Model();
        model.setId(11L);
        Signature signature = new Signature();
        signature.setId(12L);
        signature.setModel(model);
        when(modelService.createModel(4L, 4L, "demo", modelFile)).thenReturn(model);
        when(analyzerService.generateInputSignature(4L, modelFile, null)).thenReturn(Map.of("x", "int"));
        when(signatureService.createSignature(4L, 4L, 11L, Map.of("x", "int"), "Model", 0, 0, 0, null))
                .thenReturn(signature);

        assertEquals(HttpStatus.CREATED, controller.createModel(authentication, "demo", modelFile, null).getStatusCode());
        verify(modelService).createModel(4L, 4L, "demo", modelFile);
        verify(analyzerService).generateInputSignature(4L, modelFile, null);
    }

    @Test
    void getAllModels_UsesInternalUserId() {
        when(modelService.getModels(4L)).thenReturn(List.of(new Model()));

        assertEquals(1, controller.getAllModels(authentication).getBody().size());
        verify(modelService).getModels(4L);
    }
}
