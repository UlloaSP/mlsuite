package dev.ulloasp.mlsuite.model;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotSame;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.IOException;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.core.Authentication;
import org.springframework.web.multipart.MultipartFile;

import dev.ulloasp.mlsuite.model.adapter.in.web.ModelControllerImpl;
import dev.ulloasp.mlsuite.model.application.port.in.AnalyzerUseCase;
import dev.ulloasp.mlsuite.model.application.port.in.ModelCatalogUseCase;
import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import dev.ulloasp.mlsuite.security.identity.CurrentUserResolver;
import dev.ulloasp.mlsuite.signature.application.port.in.SignatureCatalogUseCase;
import dev.ulloasp.mlsuite.signature.domain.model.Signature;

@ExtendWith(MockitoExtension.class)
class ModelControllerTest {

    @Mock
    private CurrentUserResolver currentUserResolver;

    @Mock
    private ModelCatalogUseCase modelCatalogUseCase;

    @Mock
    private SignatureCatalogUseCase signatureCatalogUseCase;

    @Mock
    private AnalyzerUseCase analyzerUseCase;

    @Mock
    private Authentication authentication;

    private ModelControllerImpl controller;

    @BeforeEach
    void setUp() {
        controller = new ModelControllerImpl(
                currentUserResolver,
                modelCatalogUseCase,
                signatureCatalogUseCase,
                analyzerUseCase);
        when(currentUserResolver.resolve(authentication)).thenReturn(new CurrentUser(4L, "alice", dev.ulloasp.mlsuite.user.domain.model.SystemRole.USER));
    }

    @Test
    void createModel_UsesReusableModelFileEverywhere() throws IOException {
        MockMultipartFile modelFile = new MockMultipartFile("model", "model.pkl", "application/octet-stream", "x".getBytes());
        Model model = new Model();
        model.setId(11L);
        Signature signature = new Signature();
        signature.setId(12L);
        signature.setModel(model);
        when(modelCatalogUseCase.createModel(eq(4L), eq("demo"), any(MultipartFile.class))).thenReturn(model);
        when(analyzerUseCase.generateInputSignature(eq(4L), any(MultipartFile.class), eq(null))).thenReturn(Map.of("x", "int"));
        when(signatureCatalogUseCase.createSignature(4L, 11L, Map.of("x", "int"), "Model", 0, 0, 0, null))
                .thenReturn(signature);

        assertEquals(HttpStatus.CREATED, controller.createModel(authentication, "demo", modelFile, null).getStatusCode());

        ArgumentCaptor<MultipartFile> modelCaptor = ArgumentCaptor.forClass(MultipartFile.class);
        verify(modelCatalogUseCase).createModel(eq(4L), eq("demo"), modelCaptor.capture());
        MultipartFile reusable = modelCaptor.getValue();
        assertNotSame(modelFile, reusable);
        assertArrayEquals("x".getBytes(), reusable.getBytes());
        assertArrayEquals("x".getBytes(), reusable.getInputStream().readAllBytes());
        verify(analyzerUseCase).generateInputSignature(4L, reusable, null);
    }

    @Test
    void getAllModels_UsesInternalUserId() {
        when(modelCatalogUseCase.getModels(4L)).thenReturn(List.of(new Model()));

        assertEquals(1, controller.getAllModels(authentication).getBody().size());
        verify(modelCatalogUseCase).getModels(4L);
    }
}

