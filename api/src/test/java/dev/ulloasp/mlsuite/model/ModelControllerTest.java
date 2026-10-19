package dev.ulloasp.mlsuite.model;

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
import org.springframework.mock.web.MockMultipartFile;

import dev.ulloasp.mlsuite.model.adapter.in.web.ModelController;
import dev.ulloasp.mlsuite.model.application.dto.CreateModelDto;
import dev.ulloasp.mlsuite.model.application.dto.FeatureImportanceDto;
import dev.ulloasp.mlsuite.model.application.dto.ModelDetailsDto;
import dev.ulloasp.mlsuite.util.PageDto;
import dev.ulloasp.mlsuite.model.application.port.in.ModelCatalogUseCase;
import dev.ulloasp.mlsuite.model.domain.exception.ModelDoesNotExistsException;
import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.organization.domain.exception.OrganizationAccessDeniedException;
import dev.ulloasp.mlsuite.security.identity.CurrentUser;

@ExtendWith(MockitoExtension.class)
class ModelControllerTest {

    @Mock
    private ModelCatalogUseCase modelCatalogUseCase;

    private CurrentUser user;

    private ModelController controller;

    @BeforeEach
    void setUp() {
        controller = new ModelController(
                modelCatalogUseCase);
        user = new CurrentUser(4L, "alice", dev.ulloasp.mlsuite.user.domain.model.SystemRole.USER);
    }

    @Test
    void createModel_DelegatesCreationToService() {
        MockMultipartFile modelFile = new MockMultipartFile("model", "model.mlbundle", "application/octet-stream", "x".getBytes());
        Model model = new Model();
        model.setId(11L);
        model.setName("demo");
        model.setVersion(0L);
        when(modelCatalogUseCase.createModel(4L, "demo", modelFile)).thenReturn(model);

        ResponseEntity<CreateModelDto> response = controller.createModel(user, "demo", modelFile);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertEquals(11L, response.getBody().model().id());
    }

    @Test
    void getModelDetails_ReturnsWhatTheBundleSaysAboutTheModel() {
        Model model = new Model();
        model.setBundleManifest(Map.of("writer_version", "0.1.0a3"));
        model.setFeatureImportances(List.of(Map.of("feature", "age", "importance", 62.5)));
        model.setModelSizeBytes(2048L);
        model.setArtifactSha256("abc");
        when(modelCatalogUseCase.getModel(4L, 11L)).thenReturn(model);

        ModelDetailsDto details = controller.getModelDetails(user, 11L).getBody();

        assertEquals(new ModelDetailsDto(Map.of("writer_version", "0.1.0a3"),
                List.of(new FeatureImportanceDto("age", 62.5)), 2048L, "abc"), details);
    }

    @Test
    void getModelDetails_HasNoImportancesForAModelWithoutStructure() {
        when(modelCatalogUseCase.getModel(4L, 11L)).thenReturn(new Model());

        assertEquals(new ModelDetailsDto(Map.of(), null, null, null), controller.getModelDetails(user, 11L).getBody());
    }

    @Test
    void getModelPage_UsesInternalUserId() {
        when(modelCatalogUseCase.getModelPage(4L, 2, 5, "rf", "name", "archived"))
                .thenReturn(new PageDto<>(List.of(), 2, 5, 0, false));

        assertEquals(2, controller.getModelPage(user, 2, 5, "rf", "name", "archived").getBody().page());
        verify(modelCatalogUseCase).getModelPage(4L, 2, 5, "rf", "name", "archived");
    }

    @Test
    void getAllModels_UsesInternalUserId() {
        Model model = new Model();
        model.setVersion(0L);
        when(modelCatalogUseCase.getModels(4L)).thenReturn(List.of(model));

        assertEquals(1, controller.getAllModels(user).getBody().size());
        verify(modelCatalogUseCase).getModels(4L);
    }

    @Test
    void getModel_ReturnsTheModelDtoForTheInternalUserId() {
        when(modelCatalogUseCase.getModel(4L, 9L)).thenReturn(model());

        var response = controller.getModel(user, 9L);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(9L, response.getBody().id());
        assertEquals("demo", response.getBody().name());
    }

    @Test
    void getModel_ExposesTheArchivedState() {
        Model archived = model();
        archived.setArchivedAt(java.time.OffsetDateTime.parse("2026-10-01T10:00:00Z"));
        when(modelCatalogUseCase.getModel(4L, 9L)).thenReturn(archived);

        assertEquals(archived.getArchivedAt(), controller.getModel(user, 9L).getBody().archivedAt());
    }

    @Test
    void getModel_PropagatesNotFoundForTheExceptionHandler() {
        when(modelCatalogUseCase.getModel(4L, 9L)).thenThrow(new ModelDoesNotExistsException(9L, "alice"));

        assertThrows(ModelDoesNotExistsException.class, () -> controller.getModel(user, 9L));
    }

    @Test
    void getModel_PropagatesForbiddenForTheExceptionHandler() {
        when(modelCatalogUseCase.getModel(4L, 9L)).thenThrow(new OrganizationAccessDeniedException(41L));

        assertThrows(OrganizationAccessDeniedException.class, () -> controller.getModel(user, 9L));
    }

    @Test
    void rename_DelegatesToCatalogUseCase() {
        Model model = model();
        when(modelCatalogUseCase.renameModel(4L, 9L, "new", 3L)).thenReturn(model);

        assertEquals("demo", controller.rename(user, 9L, "new", 3L).getBody().name());
        verify(modelCatalogUseCase).renameModel(4L, 9L, "new", 3L);
    }

    @Test
    void rename_AllowsAnOlderClientWithoutVersionDuringTheCompatibilityWindow() {
        when(modelCatalogUseCase.renameModel(4L, 9L, "new", null)).thenReturn(model());

        assertEquals(HttpStatus.OK, controller.rename(user, 9L, "new", null).getStatusCode());
        verify(modelCatalogUseCase).renameModel(4L, 9L, "new", null);
    }

    @Test
    void archive_DelegatesToCatalogUseCase() {
        Model model = model();
        when(modelCatalogUseCase.archiveModel(4L, 9L, 3L)).thenReturn(model);

        assertEquals("demo", controller.archive(user, 9L, 3L).getBody().name());
        verify(modelCatalogUseCase).archiveModel(4L, 9L, 3L);
    }

    @Test
    void duplicate_DelegatesToCatalogUseCase() {
        Model model = model();
        when(modelCatalogUseCase.duplicateModel(4L, 9L, "copy")).thenReturn(model);

        assertEquals(HttpStatus.CREATED, controller.duplicate(user, 9L, "copy").getStatusCode());
        verify(modelCatalogUseCase).duplicateModel(4L, 9L, "copy");
    }

    @Test
    void delete_DelegatesToCatalogUseCase() {
        assertEquals(HttpStatus.NO_CONTENT, controller.delete(user, 9L, 3L).getStatusCode());
        verify(modelCatalogUseCase).deleteModel(4L, 9L, 3L);
    }

    private Model model() {
        Model model = new Model();
        model.setId(9L);
        model.setName("demo");
        model.setVersion(0L);
        return model;
    }
}
