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
import dev.ulloasp.mlsuite.model.application.dto.ModelPageDto;
import dev.ulloasp.mlsuite.model.application.port.in.ModelCatalogUseCase;
import dev.ulloasp.mlsuite.model.application.service.ModelCreationService;
import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import dev.ulloasp.mlsuite.security.identity.CurrentUserResolver;

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
        CreateModelDto dto = CreateModelDto.toDto(model);
        when(modelCreationService.create(4L, "demo", modelFile, dataframeFile, "_")).thenReturn(dto);

        assertEquals(HttpStatus.CREATED, controller.createModel(authentication, "demo", modelFile, dataframeFile, "_").getStatusCode());

        verify(modelCreationService).create(4L, "demo", modelFile, dataframeFile, "_");
    }

    @Test
    void getModelPage_UsesInternalUserId() {
        when(modelCatalogUseCase.getModelPage(4L, 2, 5, "rf", "name", "archived"))
                .thenReturn(new ModelPageDto(List.of(), 2, 5, 0, false));

        assertEquals(2, controller.getModelPage(authentication, 2, 5, "rf", "name", "archived").getBody().page());
        verify(modelCatalogUseCase).getModelPage(4L, 2, 5, "rf", "name", "archived");
    }

    @Test
    void getAllModels_UsesInternalUserId() {
        when(modelCatalogUseCase.getModels(4L)).thenReturn(List.of(new Model()));

        assertEquals(1, controller.getAllModels(authentication).getBody().size());
        verify(modelCatalogUseCase).getModels(4L);
    }

    @Test
    void rename_DelegatesToCatalogUseCase() {
        Model model = model();
        when(modelCatalogUseCase.renameModel(4L, 9L, "new")).thenReturn(model);

        assertEquals("demo", controller.rename(authentication, 9L, "new").getBody().name());
        verify(modelCatalogUseCase).renameModel(4L, 9L, "new");
    }

    @Test
    void archive_DelegatesToCatalogUseCase() {
        Model model = model();
        when(modelCatalogUseCase.archiveModel(4L, 9L)).thenReturn(model);

        assertEquals("demo", controller.archive(authentication, 9L).getBody().name());
        verify(modelCatalogUseCase).archiveModel(4L, 9L);
    }

    @Test
    void duplicate_DelegatesToCatalogUseCase() {
        Model model = model();
        when(modelCatalogUseCase.duplicateModel(4L, 9L, "copy")).thenReturn(model);

        assertEquals(HttpStatus.CREATED, controller.duplicate(authentication, 9L, "copy").getStatusCode());
        verify(modelCatalogUseCase).duplicateModel(4L, 9L, "copy");
    }

    @Test
    void delete_DelegatesToCatalogUseCase() {
        assertEquals(HttpStatus.NO_CONTENT, controller.delete(authentication, 9L).getStatusCode());
        verify(modelCatalogUseCase).deleteModel(4L, 9L);
    }

    private Model model() {
        Model model = new Model();
        model.setId(9L);
        model.setName("demo");
        return model;
    }
}

