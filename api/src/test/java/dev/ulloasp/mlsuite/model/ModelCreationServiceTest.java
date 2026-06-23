package dev.ulloasp.mlsuite.model;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNotSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.lang.reflect.Method;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import dev.ulloasp.mlsuite.model.application.dto.CreateModelDto;
import dev.ulloasp.mlsuite.model.application.port.in.AnalyzerUseCase;
import dev.ulloasp.mlsuite.model.application.port.in.ModelCatalogUseCase;
import dev.ulloasp.mlsuite.model.application.service.ModelCreationService;
import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.storage.ObjectStorageService;
import jakarta.transaction.Transactional;

@ExtendWith(MockitoExtension.class)
class ModelCreationServiceTest {

    @Mock
    private ModelCatalogUseCase modelCatalogUseCase;

    @Mock
    private AnalyzerUseCase analyzerUseCase;

    @Mock
    private ObjectStorageService objectStorageService;

    private ModelCreationService service;

    @BeforeEach
    void setUp() {
        service = new ModelCreationService(
                modelCatalogUseCase,
                analyzerUseCase,
                objectStorageService);
    }

    @Test
    void create_IsTransactional() throws Exception {
        Method method = ModelCreationService.class.getMethod(
                "create",
                Long.class,
                String.class,
                MultipartFile.class,
                MultipartFile.class,
                String.class);
        assertNotNull(method.getAnnotation(Transactional.class));
    }

    @Test
    void create_CreatesModelAndStoresSchemaWithReusableFiles() throws Exception {
        MockMultipartFile modelFile = new MockMultipartFile("model", "model.joblib", "application/octet-stream", "x".getBytes());
        MockMultipartFile dataframeFile = new MockMultipartFile("dataframe", "data.joblib", "application/octet-stream", "y".getBytes());
        Model model = storedModel();
        when(modelCatalogUseCase.createModel(eq(4L), eq("demo"), any(MultipartFile.class))).thenReturn(model);
        when(analyzerUseCase.generateInputSchema(
                eq(4L),
                any(MultipartFile.class),
                any(MultipartFile.class),
                eq("_")))
                .thenReturn(Map.of("dataframe", "schema"));

        CreateModelDto result = service.create(4L, "demo", modelFile, dataframeFile, "_");

        assertEquals(Map.of("dataframe", "schema"), result.model().inputSchema());
        ArgumentCaptor<MultipartFile> modelCaptor = ArgumentCaptor.forClass(MultipartFile.class);
        verify(modelCatalogUseCase).createModel(eq(4L), eq("demo"), modelCaptor.capture());
        MultipartFile reusable = modelCaptor.getValue();
        assertNotSame(modelFile, reusable);
        assertEquals("x", new String(reusable.getInputStream().readAllBytes()));
        verify(objectStorageService, never()).delete(any(), any());
    }

    @Test
    void create_DeletesStoredObjectWhenSchemaGenerationFails() {
        MockMultipartFile modelFile = new MockMultipartFile("model", "model.joblib", "application/octet-stream", "x".getBytes());
        Model model = storedModel();
        RuntimeException failure = new RuntimeException("schema failed");
        when(modelCatalogUseCase.createModel(eq(4L), eq("demo"), any(MultipartFile.class))).thenReturn(model);
        when(analyzerUseCase.generateInputSchema(eq(4L), any(MultipartFile.class), eq(null), eq("__"))).thenThrow(failure);

        RuntimeException thrown = assertThrows(
                RuntimeException.class,
                () -> service.create(4L, "demo", modelFile, null, "__"));

        assertEquals(failure, thrown);
        verify(objectStorageService).delete("bucket", "key");
    }

    @Test
    void create_DoesNotDeleteStorageWhenModelCreationFailsBeforeStore() {
        MockMultipartFile modelFile = new MockMultipartFile("model", "model.joblib", "application/octet-stream", "x".getBytes());
        RuntimeException failure = new RuntimeException("model failed");
        when(modelCatalogUseCase.createModel(eq(4L), eq("demo"), any(MultipartFile.class))).thenThrow(failure);

        RuntimeException thrown = assertThrows(
                RuntimeException.class,
                () -> service.create(4L, "demo", modelFile, null, "__"));

        assertEquals(failure, thrown);
        verify(objectStorageService, never()).delete(any(), any());
    }

    private Model storedModel() {
        Model model = new Model();
        model.setId(11L);
        model.setName("demo");
        model.setType("classifier");
        model.setSpecificType("LogisticRegression");
        model.setFileName("model.joblib");
        model.setStorageBucket("bucket");
        model.setStorageObjectKey("key");
        return model;
    }
}
