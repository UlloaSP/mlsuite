package dev.ulloasp.mlsuite.model;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import dev.ulloasp.mlsuite.model.entities.Model;
import dev.ulloasp.mlsuite.model.repositories.ModelRepository;
import dev.ulloasp.mlsuite.model.services.ModelServiceImpl;
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
        private MultipartFile modelFile;

        private ModelServiceImpl modelService;

        private User testUser;
        private Model testModel;
        private final OAuthProvider oauthProvider = OAuthProvider.GITHUB;
        private final String oauthId = "12345";
        private final String modelName = "test-model";
        private final String username = "testuser";

        @BeforeEach
        void setUp() throws Exception {
                // Create the service instance
                modelService = new ModelServiceImpl(userRepository, modelRepository);

                // Use reflection to inject the mocked RestTemplate
                java.lang.reflect.Field restTemplateField = ModelServiceImpl.class.getDeclaredField("restTemplate");
                restTemplateField.setAccessible(true);
                restTemplateField.set(modelService, restTemplate);

                testUser = new User();
                testUser.setId(1L);
                testUser.setUsername(username);
                testUser.setOauthProvider(oauthProvider);
                testUser.setOauthId(oauthId);

                testModel = new Model();
                testModel.setId(1L);
                testModel.setUser(testUser);
                testModel.setName(modelName);
                testModel.setType("classifier");
                testModel.setSpecificType("RandomForestClassifier");
                testModel.setFileName("model.pkl");
                testModel.setModelFile(new byte[] { 1, 2, 3, 4, 5 });
        }

        // ===============================
        // CREATE MODEL TESTS
        // ===============================
        /*
         * @Test
         * void createModel_Success() throws Exception {
         * // Given
         * byte[] modelBytes = new byte[] { 1, 2, 3, 4, 5 };
         * Map<String, Object> apiResponse = Map.of(
         * "type", "classifier",
         * "specificType", "RandomForestClassifier",
         * "fileName", "model.pkl");
         * 
         * when(userRepository.findByOauthProviderAndOauthId(oauthProvider, oauthId))
         * .thenReturn(Optional.of(testUser));
         * when(modelRepository.existsByNameAndUserId(modelName, testUser.getId()))
         * .thenReturn(false);
         * when(modelFile.getBytes()).thenReturn(modelBytes);
         * when(modelFile.getResource()).thenReturn(mock(org.springframework.core.io.
         * Resource.class));
         * when(restTemplate.postForObject(
         * eq("http://localhost:8000/model/metadata"),
         * any(HttpEntity.class),
         * eq(Map.class))).thenReturn(apiResponse);
         * when(modelRepository.save(any(Model.class))).thenReturn(testModel);
         * 
         * // When
         * Model result = modelService.createModel(oauthProvider, oauthId, modelName,
         * modelFile);
         * 
         * // Then
         * assertNotNull(result);
         * assertEquals(testModel.getId(), result.getId());
         * assertEquals(testModel.getName(), result.getName());
         * assertEquals(testModel.getType(), result.getType());
         * assertEquals(testModel.getSpecificType(), result.getSpecificType());
         * assertEquals(testModel.getFileName(), result.getFileName());
         * 
         * verify(userRepository).findByOauthProviderAndOauthId(oauthProvider, oauthId);
         * verify(modelRepository).existsByNameAndUserId(modelName, testUser.getId());
         * verify(modelFile).getBytes();
         * verify(restTemplate).postForObject(
         * eq("http://localhost:8000/model/metadata"),
         * any(HttpEntity.class),
         * eq(Map.class));
         * verify(modelRepository).save(any(Model.class));
         * }
         * 
         * @Test
         * void createModel_UserDoesNotExist_ThrowsException() {
         * // Given
         * when(userRepository.findByOauthProviderAndOauthId(oauthProvider, oauthId))
         * .thenReturn(Optional.empty());
         * 
         * // When & Then
         * UserDoesNotExistException exception = assertThrows(
         * UserDoesNotExistException.class,
         * () -> modelService.createModel(oauthProvider, oauthId, modelName,
         * modelFile));
         * 
         * assertTrue(exception.getMessage().contains(oauthProvider.toString()));
         * assertTrue(exception.getMessage().contains(oauthId));
         * 
         * verify(userRepository).findByOauthProviderAndOauthId(oauthProvider, oauthId);
         * verifyNoInteractions(modelRepository);
         * verifyNoInteractions(restTemplate);
         * }
         * 
         * @Test
         * void createModel_ModelAlreadyExists_ThrowsException() {
         * // Given
         * when(userRepository.findByOauthProviderAndOauthId(oauthProvider, oauthId))
         * .thenReturn(Optional.of(testUser));
         * when(modelRepository.existsByNameAndUserId(modelName, testUser.getId()))
         * .thenReturn(true);
         * 
         * // When & Then
         * ModelAlreadyExistsException exception = assertThrows(
         * ModelAlreadyExistsException.class,
         * () -> modelService.createModel(oauthProvider, oauthId, modelName,
         * modelFile));
         * 
         * assertTrue(exception.getMessage().contains(modelName));
         * assertTrue(exception.getMessage().contains(username));
         * 
         * verify(userRepository).findByOauthProviderAndOauthId(oauthProvider, oauthId);
         * verify(modelRepository).existsByNameAndUserId(modelName, testUser.getId());
         * verifyNoInteractions(restTemplate);
         * verify(modelRepository, never()).save(any());
         * }
         * 
         * @Test
         * void createModel_InvalidModelFile_ThrowsException() throws Exception {
         * // Given
         * when(userRepository.findByOauthProviderAndOauthId(oauthProvider, oauthId))
         * .thenReturn(Optional.of(testUser));
         * when(modelRepository.existsByNameAndUserId(modelName, testUser.getId()))
         * .thenReturn(false);
         * when(modelFile.getBytes()).thenThrow(new RuntimeException("File error"));
         * 
         * // When & Then
         * IllegalArgumentException exception = assertThrows(
         * IllegalArgumentException.class,
         * () -> modelService.createModel(oauthProvider, oauthId, modelName,
         * modelFile));
         * 
         * assertTrue(exception.getMessage().contains("Model file is empty or invalid"))
         * ;
         * 
         * verify(userRepository).findByOauthProviderAndOauthId(oauthProvider, oauthId);
         * verify(modelRepository).existsByNameAndUserId(modelName, testUser.getId());
         * verify(modelFile).getBytes();
         * verifyNoInteractions(restTemplate);
         * verify(modelRepository, never()).save(any());
         * }
         * 
         * @Test
         * void createModel_RestClientException_ThrowsAnalyzerServiceException() throws
         * Exception {
         * // Given
         * byte[] modelBytes = new byte[] { 1, 2, 3, 4, 5 };
         * String responseBody = "{\"detail\":\"Not a sklearn estimator\"}";
         * RestClientResponseException restException = new RestClientResponseException(
         * "Not a sklearn estimator", 400, "Bad Request", null, responseBody.getBytes(),
         * null);
         * 
         * when(userRepository.findByOauthProviderAndOauthId(oauthProvider, oauthId))
         * .thenReturn(Optional.of(testUser));
         * when(modelRepository.existsByNameAndUserId(modelName, testUser.getId()))
         * .thenReturn(false);
         * when(modelFile.getBytes()).thenReturn(modelBytes);
         * when(modelFile.getResource()).thenReturn(mock(org.springframework.core.io.
         * Resource.class));
         * when(restTemplate.postForObject(
         * eq("http://localhost:8000/model/metadata"),
         * any(HttpEntity.class),
         * eq(Map.class))).thenThrow(restException);
         * 
         * // When & Then
         * AnalyzerServiceException exception = assertThrows(
         * AnalyzerServiceException.class,
         * () -> modelService.createModel(oauthProvider, oauthId, modelName,
         * modelFile));
         * 
         * assertEquals(400, exception.getStatus());
         * assertEquals("http://localhost:8000/model/metadata",
         * exception.getEndpoint());
         * assertEquals("Not a sklearn estimator", exception.getDetail());
         * 
         * verify(userRepository).findByOauthProviderAndOauthId(oauthProvider, oauthId);
         * verify(modelRepository).existsByNameAndUserId(modelName, testUser.getId());
         * verify(modelFile).getBytes();
         * verify(restTemplate).postForObject(
         * eq("http://localhost:8000/model/metadata"),
         * any(HttpEntity.class),
         * eq(Map.class));
         * verify(modelRepository, never()).save(any());
         * }
         * 
         * @Test
         * void createModel_ResourceAccessException_ThrowsAnalyzerServiceException()
         * throws Exception {
         * // Given
         * byte[] modelBytes = new byte[] { 1, 2, 3, 4, 5 };
         * ResourceAccessException resourceException = new
         * ResourceAccessException("Connection refused");
         * 
         * when(userRepository.findByOauthProviderAndOauthId(oauthProvider, oauthId))
         * .thenReturn(Optional.of(testUser));
         * when(modelRepository.existsByNameAndUserId(modelName, testUser.getId()))
         * .thenReturn(false);
         * when(modelFile.getBytes()).thenReturn(modelBytes);
         * when(modelFile.getResource()).thenReturn(mock(org.springframework.core.io.
         * Resource.class));
         * when(restTemplate.postForObject(
         * eq("http://localhost:8000/model/metadata"),
         * any(HttpEntity.class),
         * eq(Map.class))).thenThrow(resourceException);
         * 
         * // When & Then
         * AnalyzerServiceException exception = assertThrows(
         * AnalyzerServiceException.class,
         * () -> modelService.createModel(oauthProvider, oauthId, modelName,
         * modelFile));
         * 
         * assertEquals(0, exception.getStatus()); // Network error has status 0
         * assertEquals("http://localhost:8000/model/metadata",
         * exception.getEndpoint());
         * assertEquals("Analyzer service unreachable", exception.getDetail());
         * 
         * verify(userRepository).findByOauthProviderAndOauthId(oauthProvider, oauthId);
         * verify(modelRepository).existsByNameAndUserId(modelName, testUser.getId());
         * verify(modelFile).getBytes();
         * verify(restTemplate).postForObject(
         * eq("http://localhost:8000/model/metadata"),
         * any(HttpEntity.class),
         * eq(Map.class));
         * verify(modelRepository, never()).save(any());
         * }
         * 
         * @Test
         * void createModel_ApiResponseWithNullValues_HandlesGracefully() throws
         * Exception {
         * // Given
         * byte[] modelBytes = new byte[] { 1, 2, 3, 4, 5 };
         * Map<String, Object> apiResponse = Map.of(
         * "type", "classifier"
         * // specificType and fileName are null
         * );
         * 
         * when(userRepository.findByOauthProviderAndOauthId(oauthProvider, oauthId))
         * .thenReturn(Optional.of(testUser));
         * when(modelRepository.existsByNameAndUserId(modelName, testUser.getId()))
         * .thenReturn(false);
         * when(modelFile.getBytes()).thenReturn(modelBytes);
         * when(modelFile.getResource()).thenReturn(mock(org.springframework.core.io.
         * Resource.class));
         * when(restTemplate.postForObject(
         * eq("http://localhost:8000/model/metadata"),
         * any(HttpEntity.class),
         * eq(Map.class))).thenReturn(apiResponse);
         * when(modelRepository.save(any(Model.class))).thenAnswer(invocation -> {
         * Model model = invocation.getArgument(0);
         * model.setId(1L);
         * return model;
         * });
         * 
         * // When
         * Model result = modelService.createModel(oauthProvider, oauthId, modelName,
         * modelFile);
         * 
         * // Then
         * assertNotNull(result);
         * assertEquals("classifier", result.getType());
         * assertNull(result.getSpecificType());
         * assertNull(result.getFileName());
         * 
         * verify(modelRepository).save(any(Model.class));
         * }
         */
        // ===============================
        // GET MODELS TESTS
        // ===============================

        @Test
        void getModels_Success() {
                // Given
                Model model2 = new Model();
                model2.setId(2L);
                model2.setUser(testUser);
                model2.setName("model2");

                List<Model> expectedModels = Arrays.asList(testModel, model2);

                when(userRepository.findByOauthProviderAndOauthId(oauthProvider, oauthId))
                                .thenReturn(Optional.of(testUser));
                when(modelRepository.findByUserId(testUser.getId()))
                                .thenReturn(expectedModels);

                // When
                List<Model> result = modelService.getModels(oauthProvider, oauthId);

                // Then
                assertNotNull(result);
                assertEquals(2, result.size());
                assertEquals(expectedModels, result);

                verify(userRepository).findByOauthProviderAndOauthId(oauthProvider, oauthId);
                verify(modelRepository).findByUserId(testUser.getId());
        }

        @Test
        void getModels_UserDoesNotExist_ThrowsException() {
                // Given
                when(userRepository.findByOauthProviderAndOauthId(oauthProvider, oauthId))
                                .thenReturn(Optional.empty());

                // When & Then
                UserDoesNotExistException exception = assertThrows(
                                UserDoesNotExistException.class,
                                () -> modelService.getModels(oauthProvider, oauthId));

                assertTrue(exception.getMessage().contains(oauthProvider.toString()));
                assertTrue(exception.getMessage().contains(oauthId));

                verify(userRepository).findByOauthProviderAndOauthId(oauthProvider, oauthId);
                verifyNoInteractions(modelRepository);
        }

        @Test
        void getModels_EmptyList_ReturnsEmptyList() {
                // Given
                when(userRepository.findByOauthProviderAndOauthId(oauthProvider, oauthId))
                                .thenReturn(Optional.of(testUser));
                when(modelRepository.findByUserId(testUser.getId()))
                                .thenReturn(Arrays.asList());

                // When
                List<Model> result = modelService.getModels(oauthProvider, oauthId);

                // Then
                assertNotNull(result);
                assertTrue(result.isEmpty());

                verify(userRepository).findByOauthProviderAndOauthId(oauthProvider, oauthId);
                verify(modelRepository).findByUserId(testUser.getId());
        }
}
