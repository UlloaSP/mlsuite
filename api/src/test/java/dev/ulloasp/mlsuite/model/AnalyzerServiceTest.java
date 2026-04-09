/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.model;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.client.RestTemplate;

import dev.ulloasp.mlsuite.model.entities.Model;
import dev.ulloasp.mlsuite.model.repositories.ModelRepository;
import dev.ulloasp.mlsuite.model.services.AnalyzerServiceImpl;
import dev.ulloasp.mlsuite.storage.ObjectStorageException;
import dev.ulloasp.mlsuite.storage.ObjectStorageService;
import dev.ulloasp.mlsuite.user.entity.OAuthProvider;

@ExtendWith(MockitoExtension.class)
class AnalyzerServiceTest {

    @Mock
    private RestTemplate restTemplate;

    @Mock
    private ModelRepository modelRepository;

    @Mock
    private ObjectStorageService objectStorageService;

    private AnalyzerServiceImpl analyzerService;
    private Map<String, Object> predictionInput;
    private Map<String, Object> predictionOutput;

    @BeforeEach
    void setUp() throws Exception {
        analyzerService = new AnalyzerServiceImpl(modelRepository, objectStorageService);

        java.lang.reflect.Field restTemplateField = AnalyzerServiceImpl.class.getDeclaredField("restTemplate");
        restTemplateField.setAccessible(true);
        restTemplateField.set(analyzerService, restTemplate);

        java.lang.reflect.Field analyzerUrlField = AnalyzerServiceImpl.class.getDeclaredField("analyzerUrl");
        analyzerUrlField.setAccessible(true);
        analyzerUrlField.set(analyzerService, "https://py-analyzer:8000");

        predictionInput = new HashMap<>();
        predictionInput.put("feature1", 1.5);
        predictionInput.put("feature2", 10);

        predictionOutput = new HashMap<>();
        predictionOutput.put("prediction", "positive");
        predictionOutput.put("probability", 0.91);
    }

    @Test
    void predict_UsesObjectStorageWhenAvailable() {
        Model model = new Model();
        model.setId(1L);
        model.setStorageBucket("mlsuite-models");
        model.setStorageObjectKey("users/1/models/test/model.pkl");

        when(modelRepository.findById(1L)).thenReturn(Optional.of(model));
        when(objectStorageService.load("mlsuite-models", "users/1/models/test/model.pkl"))
                .thenReturn(new byte[] { 1, 2, 3 });
        when(restTemplate.postForObject(eq("https://py-analyzer:8000/predict"), any(), eq(Map.class)))
                .thenReturn(predictionOutput);

        Map<String, Object> result = analyzerService.predict(OAuthProvider.GITHUB, "github123", 1L, predictionInput);

        assertNotNull(result);
        assertEquals(predictionOutput, result);
        verify(objectStorageService).load("mlsuite-models", "users/1/models/test/model.pkl");
        verify(restTemplate).postForObject(eq("https://py-analyzer:8000/predict"), any(), eq(Map.class));
    }

    @Test
    void predict_FallsBackToInlineBytesWhenObjectStorageFails() {
        Model model = new Model();
        model.setId(1L);
        model.setStorageBucket("mlsuite-models");
        model.setStorageObjectKey("users/1/models/test/model.pkl");
        model.setModelFile(new byte[] { 9, 8, 7 });

        when(modelRepository.findById(1L)).thenReturn(Optional.of(model));
        when(objectStorageService.load("mlsuite-models", "users/1/models/test/model.pkl"))
                .thenThrow(new ObjectStorageException("minio down"));
        when(restTemplate.postForObject(eq("https://py-analyzer:8000/predict"), any(), eq(Map.class)))
                .thenReturn(predictionOutput);

        Map<String, Object> result = analyzerService.predict(OAuthProvider.GITHUB, "github123", 1L, predictionInput);

        assertNotNull(result);
        assertEquals(predictionOutput, result);
        verify(objectStorageService).load("mlsuite-models", "users/1/models/test/model.pkl");
        verify(restTemplate).postForObject(eq("https://py-analyzer:8000/predict"), any(), eq(Map.class));
    }

    @Test
    void predict_UsesInlineBytesForLegacyModelsWithoutObjectStorage() {
        Model model = new Model();
        model.setId(1L);
        model.setModelFile(new byte[] { 4, 5, 6 });

        when(modelRepository.findById(1L)).thenReturn(Optional.of(model));
        when(restTemplate.postForObject(eq("https://py-analyzer:8000/predict"), any(), eq(Map.class)))
                .thenReturn(predictionOutput);

        Map<String, Object> result = analyzerService.predict(OAuthProvider.GITHUB, "github123", 1L, predictionInput);

        assertNotNull(result);
        assertEquals(predictionOutput, result);
        verifyNoInteractions(objectStorageService);
        verify(restTemplate).postForObject(eq("https://py-analyzer:8000/predict"), any(), eq(Map.class));
    }

    @Test
    void predict_WithoutStoredOrInlineBytes_ThrowsException() {
        Model model = new Model();
        model.setId(1L);
        model.setModelFile(new byte[0]);

        when(modelRepository.findById(1L)).thenReturn(Optional.of(model));

        IllegalStateException exception = assertThrows(
                IllegalStateException.class,
                () -> analyzerService.predict(OAuthProvider.GITHUB, "github123", 1L, predictionInput));

        assertEquals("El modelo no tiene binario en object storage ni en base de datos", exception.getMessage());
        verifyNoInteractions(objectStorageService, restTemplate);
    }
}
