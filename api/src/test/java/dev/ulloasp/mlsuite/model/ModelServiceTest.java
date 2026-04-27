package dev.ulloasp.mlsuite.model;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import dev.ulloasp.mlsuite.model.entities.Model;
import dev.ulloasp.mlsuite.model.exceptions.ModelAlreadyExistsException;
import dev.ulloasp.mlsuite.model.repositories.ModelRepository;
import dev.ulloasp.mlsuite.model.services.ModelServiceImpl;
import dev.ulloasp.mlsuite.storage.ObjectStorageService;
import dev.ulloasp.mlsuite.storage.StoredObject;
import dev.ulloasp.mlsuite.user.entity.User;
import dev.ulloasp.mlsuite.user.service.UserLookupService;

@ExtendWith(MockitoExtension.class)
class ModelServiceTest {

    @Mock
    private UserLookupService userLookupService;

    @Mock
    private ModelRepository modelRepository;

    @Mock
    private ObjectStorageService objectStorageService;

    @Mock
    private RestTemplate restTemplate;

    @Mock
    private MultipartFile modelFile;

    private ModelServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new ModelServiceImpl(userLookupService, modelRepository, objectStorageService);
        ReflectionTestUtils.setField(service, "restTemplate", restTemplate);
        ReflectionTestUtils.setField(service, "analyzerUrl", "http://analyzer");
    }

    @Test
    void getModels_UsesInternalUserId() {
        when(modelRepository.findByUserId(3L)).thenReturn(List.of(new Model()));

        assertEquals(1, service.getModels(3L).size());
    }

    @Test
    void createModel_ThrowsWhenNameExists() {
        when(userLookupService.requireById(3L)).thenReturn(user());
        when(modelRepository.existsByNameAndUserId("demo", 3L)).thenReturn(true);

        assertThrows(ModelAlreadyExistsException.class, () -> service.createModel(3L, "demo", modelFile));
    }

    @Test
    void createModel_StoresObjectAndPersistsModel() throws Exception {
        when(userLookupService.requireById(3L)).thenReturn(user());
        when(modelRepository.existsByNameAndUserId("demo", 3L)).thenReturn(false);
        when(restTemplate.postForObject(anyString(), any(), eq(Map.class)))
                .thenReturn(Map.of("type", "clf", "specificType", "rf", "fileName", "model.pkl"));
        when(modelFile.getResource()).thenReturn(new org.springframework.core.io.ByteArrayResource("x".getBytes()));
        when(modelFile.getInputStream()).thenReturn(new java.io.ByteArrayInputStream("x".getBytes()));
        when(modelFile.getSize()).thenReturn(1L);
        when(modelFile.getContentType()).thenReturn("application/octet-stream");
        when(objectStorageService.store(any(), any(), any(), any(), anyLong()))
                .thenReturn(new StoredObject("bucket", "key", 1L, "etag"));
        when(modelRepository.save(any(Model.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Model result = service.createModel(3L, "demo", modelFile);

        assertEquals("demo", result.getName());
        verify(modelRepository).save(any(Model.class));
    }

    private User user() {
        User user = new User();
        user.setId(3L);
        user.setUsername("alice");
        return user;
    }
}
