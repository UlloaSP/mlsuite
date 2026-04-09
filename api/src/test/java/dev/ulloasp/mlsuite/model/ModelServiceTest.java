/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.model;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import dev.ulloasp.mlsuite.model.entities.Model;
import dev.ulloasp.mlsuite.model.exceptions.ModelAlreadyExistsException;
import dev.ulloasp.mlsuite.model.repositories.ModelRepository;
import dev.ulloasp.mlsuite.model.services.ModelServiceImpl;
import dev.ulloasp.mlsuite.storage.ObjectStorageService;
import dev.ulloasp.mlsuite.storage.StoredObject;
import dev.ulloasp.mlsuite.user.entity.OAuthProvider;
import dev.ulloasp.mlsuite.user.entity.User;
import dev.ulloasp.mlsuite.user.exceptions.UserDoesNotExistException;
import dev.ulloasp.mlsuite.user.repository.UserRepository;

@ExtendWith(MockitoExtension.class)
public class ModelServiceTest {

    @Mock
    private RestTemplate restTemplate;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ModelRepository modelRepository;

    @Mock
    private ObjectStorageService objectStorageService;

    @Mock
    private MultipartFile modelFile;

    private ModelServiceImpl modelService;

    private User testUser;
    private final OAuthProvider oauthProvider = OAuthProvider.GITHUB;
    private final String oauthId = "12345";
    private final String modelName = "test-model";
    private final String username = "testuser";

    @BeforeEach
    void setUp() throws Exception {
        modelService = new ModelServiceImpl(userRepository, modelRepository, objectStorageService);

        java.lang.reflect.Field restTemplateField = ModelServiceImpl.class.getDeclaredField("restTemplate");
        restTemplateField.setAccessible(true);
        restTemplateField.set(modelService, restTemplate);

        java.lang.reflect.Field analyzerUrlField = ModelServiceImpl.class.getDeclaredField("analyzerUrl");
        analyzerUrlField.setAccessible(true);
        analyzerUrlField.set(modelService, "https://py-analyzer:8000");

        testUser = new User();
        testUser.setId(1L);
        testUser.setUsername(username);
        testUser.setOauthProvider(oauthProvider);
        testUser.setOauthId(oauthId);
    }

    @Test
    void createModel_Success_StoresObjectInMinioAndPersistsMetadata() throws Exception {
        byte[] modelBytes = new byte[] { 1, 2, 3, 4, 5 };
        Map<String, Object> apiResponse = new HashMap<>();
        apiResponse.put("type", "classifier");
        apiResponse.put("specificType", "RandomForestClassifier");
        apiResponse.put("fileName", "model.pkl");

        when(userRepository.findByOauthProviderAndOauthId(oauthProvider, oauthId))
                .thenReturn(Optional.of(testUser));
        when(modelRepository.existsByNameAndUserId(modelName, testUser.getId()))
                .thenReturn(false);
        when(modelFile.getResource()).thenReturn(new ByteArrayResource(modelBytes));
        when(modelFile.getInputStream()).thenReturn(new java.io.ByteArrayInputStream(modelBytes));
        when(modelFile.getSize()).thenReturn((long) modelBytes.length);
        when(modelFile.getContentType()).thenReturn("application/octet-stream");
        when(restTemplate.postForObject(
                eq("https://py-analyzer:8000/metadata"),
                any(),
                eq(Map.class)))
                .thenReturn(apiResponse);
        when(objectStorageService.store(any(), eq("model.pkl"), eq("application/octet-stream"), any(), eq((long) modelBytes.length)))
                .thenReturn(new StoredObject("mlsuite-models", "users/1/models/test", modelBytes.length, "etag123"));
        when(modelRepository.save(any(Model.class))).thenAnswer(invocation -> {
            Model model = invocation.getArgument(0);
            model.setId(99L);
            return model;
        });

        Model result = modelService.createModel(oauthProvider, oauthId, modelName, modelFile);

        assertNotNull(result);
        assertEquals(99L, result.getId());
        assertEquals(modelName, result.getName());
        assertEquals("classifier", result.getType());
        assertEquals("RandomForestClassifier", result.getSpecificType());
        assertEquals("model.pkl", result.getFileName());
        assertEquals("mlsuite-models", result.getStorageBucket());
        assertEquals("users/1/models/test", result.getStorageObjectKey());
        assertEquals("etag123", result.getStorageEtag());
        assertEquals(modelBytes.length, result.getModelSizeBytes());
        assertEquals(0, result.getModelFile().length);

        ArgumentCaptor<Model> modelCaptor = ArgumentCaptor.forClass(Model.class);
        verify(modelRepository).save(modelCaptor.capture());
        assertEquals(0, modelCaptor.getValue().getModelFile().length);
        verify(objectStorageService, never()).delete(any(), any());
    }

    @Test
    void createModel_SaveFails_DeletesStoredObject() throws Exception {
        byte[] modelBytes = new byte[] { 1, 2, 3 };
        Map<String, Object> apiResponse = Map.of(
                "type", "classifier",
                "specificType", "RandomForestClassifier",
                "fileName", "model.pkl");

        when(userRepository.findByOauthProviderAndOauthId(oauthProvider, oauthId))
                .thenReturn(Optional.of(testUser));
        when(modelRepository.existsByNameAndUserId(modelName, testUser.getId()))
                .thenReturn(false);
        when(modelFile.getResource()).thenReturn(new ByteArrayResource(modelBytes));
        when(modelFile.getInputStream()).thenReturn(new java.io.ByteArrayInputStream(modelBytes));
        when(modelFile.getSize()).thenReturn((long) modelBytes.length);
        when(modelFile.getContentType()).thenReturn("application/octet-stream");
        when(restTemplate.postForObject(
                eq("https://py-analyzer:8000/metadata"),
                any(),
                eq(Map.class)))
                .thenReturn(apiResponse);
        when(objectStorageService.store(any(), eq("model.pkl"), eq("application/octet-stream"), any(), eq((long) modelBytes.length)))
                .thenReturn(new StoredObject("mlsuite-models", "users/1/models/test", modelBytes.length, "etag123"));
        when(modelRepository.save(any(Model.class))).thenThrow(new RuntimeException("db error"));

        RuntimeException exception = assertThrows(
                RuntimeException.class,
                () -> modelService.createModel(oauthProvider, oauthId, modelName, modelFile));

        assertEquals("db error", exception.getMessage());
        verify(objectStorageService).delete("mlsuite-models", "users/1/models/test");
    }

    @Test
    void createModel_UserDoesNotExist_ThrowsException() {
        when(userRepository.findByOauthProviderAndOauthId(oauthProvider, oauthId))
                .thenReturn(Optional.empty());

        UserDoesNotExistException exception = assertThrows(
                UserDoesNotExistException.class,
                () -> modelService.createModel(oauthProvider, oauthId, modelName, modelFile));

        assertTrue(exception.getMessage().contains(oauthProvider.toString()));
        assertTrue(exception.getMessage().contains(oauthId));

        verify(userRepository).findByOauthProviderAndOauthId(oauthProvider, oauthId);
        verifyNoInteractions(modelRepository, restTemplate, objectStorageService);
    }

    @Test
    void createModel_ModelAlreadyExists_ThrowsException() {
        when(userRepository.findByOauthProviderAndOauthId(oauthProvider, oauthId))
                .thenReturn(Optional.of(testUser));
        when(modelRepository.existsByNameAndUserId(modelName, testUser.getId()))
                .thenReturn(true);

        ModelAlreadyExistsException exception = assertThrows(
                ModelAlreadyExistsException.class,
                () -> modelService.createModel(oauthProvider, oauthId, modelName, modelFile));

        assertTrue(exception.getMessage().contains(modelName));
        assertTrue(exception.getMessage().contains(username));

        verify(userRepository).findByOauthProviderAndOauthId(oauthProvider, oauthId);
        verify(modelRepository).existsByNameAndUserId(modelName, testUser.getId());
        verifyNoInteractions(restTemplate, objectStorageService);
    }

    @Test
    void getModels_Success() {
        Model model1 = new Model();
        model1.setId(1L);
        model1.setName("model1");
        Model model2 = new Model();
        model2.setId(2L);
        model2.setName("model2");
        List<Model> expectedModels = Arrays.asList(model1, model2);

        when(userRepository.findByOauthProviderAndOauthId(oauthProvider, oauthId))
                .thenReturn(Optional.of(testUser));
        when(modelRepository.findByUserId(testUser.getId()))
                .thenReturn(expectedModels);

        List<Model> result = modelService.getModels(oauthProvider, oauthId);

        assertNotNull(result);
        assertEquals(expectedModels, result);

        verify(userRepository).findByOauthProviderAndOauthId(oauthProvider, oauthId);
        verify(modelRepository).findByUserId(testUser.getId());
    }
}
