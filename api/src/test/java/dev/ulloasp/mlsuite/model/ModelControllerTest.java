package dev.ulloasp.mlsuite.model;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.core.Authentication;

import dev.ulloasp.mlsuite.model.adapter.in.web.ModelControllerImpl;
import dev.ulloasp.mlsuite.model.application.dto.CreateModelDto;
import dev.ulloasp.mlsuite.model.application.port.in.ModelCatalogUseCase;
import dev.ulloasp.mlsuite.model.application.service.ModelCreationService;
import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import dev.ulloasp.mlsuite.security.identity.CurrentUserResolver;
import dev.ulloasp.mlsuite.signature.domain.model.Signature;

@ExtendWith(MockitoExtension.class)
class ModelControllerTest {

    @Mock
    private CurrentUserResolver currentUserResolver;

    @Mock
    private ModelCatalogUseCase modelCatalogUseCase;

    @Mock
    private ModelCreationService modelCreationService;

    @Mock
    private Authentication authentication;

    private ModelControllerImpl controller;

    @BeforeEach
    void setUp() {
        controller = new ModelControllerImpl(
                currentUserResolver,
                modelCatalogUseCase,
                modelCreationService);
        when(currentUserResolver.resolve(authentication)).thenReturn(new CurrentUser(4L, "alice", dev.ulloasp.mlsuite.user.domain.model.SystemRole.USER));
    }

    @Test
    void createModel_DelegatesCreationToService() {
        MockMultipartFile modelFile = new MockMultipartFile("model", "model.pkl", "application/octet-stream", "x".getBytes());
        MockMultipartFile dataframeFile = new MockMultipartFile("dataframe", "data.joblib", "application/octet-stream", "y".getBytes());
        Model model = new Model();
        model.setId(11L);
        model.setName("demo");
        Signature signature = new Signature();
        signature.setId(12L);
        signature.setModel(model);
        CreateModelDto dto = CreateModelDto.toDto(model, signature, null);
        when(modelCreationService.create(4L, "demo", modelFile, dataframeFile)).thenReturn(dto);

        assertEquals(HttpStatus.CREATED, controller.createModel(authentication, "demo", modelFile, dataframeFile).getStatusCode());

        verify(modelCreationService).create(4L, "demo", modelFile, dataframeFile);
    }

    @Test
    void getAllModels_UsesInternalUserId() {
        when(modelCatalogUseCase.getModels(4L)).thenReturn(List.of(new Model()));

        assertEquals(1, controller.getAllModels(authentication).getBody().size());
        verify(modelCatalogUseCase).getModels(4L);
    }
}

