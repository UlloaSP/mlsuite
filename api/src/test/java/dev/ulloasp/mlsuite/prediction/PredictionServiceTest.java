/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.prediction;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import dev.ulloasp.mlsuite.model.entities.Model;
import dev.ulloasp.mlsuite.prediction.entities.Prediction;
import dev.ulloasp.mlsuite.prediction.entities.PredictionStatus;
import dev.ulloasp.mlsuite.prediction.exceptions.PredictionAlreadyExistsException;
import dev.ulloasp.mlsuite.prediction.exceptions.PredictionDoesNotExistsException;
import dev.ulloasp.mlsuite.prediction.repositories.PredictionRepository;
import dev.ulloasp.mlsuite.prediction.services.PredictionServiceImpl;
import dev.ulloasp.mlsuite.signature.entities.Signature;
import dev.ulloasp.mlsuite.signature.exceptions.SignatureDoesNotExistsException;
import dev.ulloasp.mlsuite.signature.repositories.SignatureRepository;
import dev.ulloasp.mlsuite.user.entity.OAuthProvider;
import dev.ulloasp.mlsuite.user.entity.User;
import dev.ulloasp.mlsuite.user.exceptions.UserDoesNotExistException;
import dev.ulloasp.mlsuite.user.repository.UserRepository;

@ExtendWith(MockitoExtension.class)
class PredictionServiceTest {

        @Mock
        private UserRepository userRepository;

        @Mock
        private SignatureRepository signatureRepository;

        @Mock
        private PredictionRepository predictionRepository;

        @InjectMocks
        private PredictionServiceImpl predictionService;

        private User testUser;
        private Model testModel;
        private Signature testSignature;
        private Prediction testPrediction;
        private Map<String, Object> testData;
        private Map<String, Object> testPredictionData;

        @BeforeEach
        void setUp() {
                testUser = new User();
                testUser.setId(1L);
                testUser.setUsername("testuser");
                testUser.setEmail("test@example.com");
                testUser.setFullName("Test User");
                testUser.setOauthProvider(OAuthProvider.GITHUB);
                testUser.setOauthId("github123");
                testUser.setAvatarUrl("https://example.com/avatar.jpg");
                testUser.setCreatedAt(OffsetDateTime.now());
                testUser.setUpdatedAt(OffsetDateTime.now());

                testModel = new Model();
                testModel.setId(1L);
                testModel.setName("Test Model");
                testModel.setType("classification");
                testModel.setSpecificType("random_forest");
                testModel.setFileName("model.pkl");
                testModel.setModelFile(new byte[] { 1, 2, 3 });
                testModel.setUser(testUser);
                testModel.setCreatedAt(OffsetDateTime.now());
                testModel.setUpdatedAt(OffsetDateTime.now());

                Map<String, Object> inputSignature = new HashMap<>();
                inputSignature.put("feature1", "float");
                inputSignature.put("feature2", "int");

                testSignature = new Signature();
                testSignature.setId(1L);
                testSignature.setName("Test Signature");
                testSignature.setMajor(1);
                testSignature.setMinor(0);
                testSignature.setPatch(0);
                testSignature.setInputSignature(inputSignature);
                testSignature.setModel(testModel);
                testSignature.setCreatedAt(OffsetDateTime.now());
                testSignature.setUpdatedAt(OffsetDateTime.now());

                testData = new HashMap<>();
                testData.put("feature1", 1.5);
                testData.put("feature2", 10);

                testPredictionData = new HashMap<>();
                testPredictionData.put("class", "positive");
                testPredictionData.put("probability", 0.85);

                testPrediction = new Prediction();
                testPrediction.setId(1L);
                testPrediction.setSignature(testSignature);
                testPrediction.setName("Test Prediction");
                testPrediction.setData(testData);
                testPrediction.setPrediction(testPredictionData);
                testPrediction.setStatus(PredictionStatus.PENDING);
                testPrediction.setCreatedAt(OffsetDateTime.now());
                testPrediction.setUpdatedAt(OffsetDateTime.now());
        }

        // Tests for createPrediction method

        @Test
        void createPrediction_Success() {
                // Given
                when(userRepository.findByOauthProviderAndOauthId(OAuthProvider.GITHUB, "github123"))
                                .thenReturn(Optional.of(testUser));
                when(signatureRepository.findByIdAndUserId(1L, 1L))
                                .thenReturn(Optional.of(testSignature));
                when(predictionRepository.existsBySignatureIdAndName(1L, "Test Prediction"))
                                .thenReturn(false);
                when(predictionRepository.save(any(Prediction.class)))
                                .thenReturn(testPrediction);

                // When
                Prediction result = predictionService.createPrediction(
                                OAuthProvider.GITHUB, "github123", 1L, "Test Prediction", testPredictionData, testData);

                // Then
                assertNotNull(result);
                assertEquals("Test Prediction", result.getName());
                assertEquals(testData, result.getData());
                assertEquals(testPredictionData, result.getPrediction());
                assertEquals(testSignature, result.getSignature());
                assertEquals(PredictionStatus.PENDING, result.getStatus());

                verify(userRepository).findByOauthProviderAndOauthId(OAuthProvider.GITHUB, "github123");
                verify(signatureRepository).findByIdAndUserId(1L, 1L);
                verify(predictionRepository).existsBySignatureIdAndName(1L, "Test Prediction");
                verify(predictionRepository).save(any(Prediction.class));
        }

        @Test
        void createPrediction_UserDoesNotExist() {
                // Given
                when(userRepository.findByOauthProviderAndOauthId(OAuthProvider.GITHUB, "nonexistent"))
                                .thenReturn(Optional.empty());

                // When & Then
                UserDoesNotExistException exception = assertThrows(UserDoesNotExistException.class,
                                () -> predictionService.createPrediction(
                                                OAuthProvider.GITHUB, "nonexistent", 1L, "Test Prediction",
                                                testPredictionData, testData));

                assertEquals("User with OAuth provider 'github' and ID 'nonexistent' does not exist",
                                exception.getMessage());

                verify(userRepository).findByOauthProviderAndOauthId(OAuthProvider.GITHUB, "nonexistent");
                verifyNoInteractions(signatureRepository);
                verifyNoInteractions(predictionRepository);
        }

        @Test
        void createPrediction_SignatureDoesNotExist() {
                // Given
                when(userRepository.findByOauthProviderAndOauthId(OAuthProvider.GITHUB, "github123"))
                                .thenReturn(Optional.of(testUser));
                when(signatureRepository.findByIdAndUserId(999L, 1L))
                                .thenReturn(Optional.empty());

                // When & Then
                SignatureDoesNotExistsException exception = assertThrows(SignatureDoesNotExistsException.class,
                                () -> predictionService.createPrediction(
                                                OAuthProvider.GITHUB, "github123", 999L, "Test Prediction",
                                                testPredictionData, testData));

                assertEquals("Signature with ID '999' does not exist.", exception.getMessage());

                verify(userRepository).findByOauthProviderAndOauthId(OAuthProvider.GITHUB, "github123");
                verify(signatureRepository).findByIdAndUserId(999L, 1L);
                verify(predictionRepository, never()).existsBySignatureIdAndName(anyLong(), anyString());
                verify(predictionRepository, never()).save(any());
        }

        @Test
        void createPrediction_PredictionAlreadyExists() {
                // Given
                when(userRepository.findByOauthProviderAndOauthId(OAuthProvider.GITHUB, "github123"))
                                .thenReturn(Optional.of(testUser));
                when(signatureRepository.findByIdAndUserId(1L, 1L))
                                .thenReturn(Optional.of(testSignature));
                when(predictionRepository.existsBySignatureIdAndName(1L, "Duplicate Prediction"))
                                .thenReturn(true);

                // When & Then
                PredictionAlreadyExistsException exception = assertThrows(PredictionAlreadyExistsException.class,
                                () -> predictionService.createPrediction(
                                                OAuthProvider.GITHUB, "github123", 1L, "Duplicate Prediction",
                                                testPredictionData, testData));

                assertEquals("Signature with name 'Test Signature' already has a prediction with name 'Duplicate Prediction'",
                                exception.getMessage());

                verify(userRepository).findByOauthProviderAndOauthId(OAuthProvider.GITHUB, "github123");
                verify(signatureRepository).findByIdAndUserId(1L, 1L);
                verify(predictionRepository).existsBySignatureIdAndName(1L, "Duplicate Prediction");
                verify(predictionRepository, never()).save(any());
        }

        // Tests for updatePrediction method

        @Test
        void updatePrediction_Success() {
                // Given
                when(userRepository.findByOauthProviderAndOauthId(OAuthProvider.GITHUB, "github123"))
                                .thenReturn(Optional.of(testUser));
                when(predictionRepository.findById(1L))
                                .thenReturn(Optional.of(testPrediction));
                when(predictionRepository.save(testPrediction))
                                .thenReturn(testPrediction);

                // When
                Prediction result = predictionService.updatePrediction(
                                OAuthProvider.GITHUB, "github123", 1L, PredictionStatus.COMPLETED);

                // Then
                assertNotNull(result);
                assertEquals(PredictionStatus.COMPLETED, result.getStatus());

                verify(userRepository).findByOauthProviderAndOauthId(OAuthProvider.GITHUB, "github123");
                verify(predictionRepository).findById(1L);
                verify(predictionRepository).save(testPrediction);
        }

        @Test
        void updatePrediction_UserDoesNotExist() {
                // Given
                when(userRepository.findByOauthProviderAndOauthId(OAuthProvider.GITHUB, "nonexistent"))
                                .thenReturn(Optional.empty());

                // When & Then
                UserDoesNotExistException exception = assertThrows(UserDoesNotExistException.class,
                                () -> predictionService.updatePrediction(
                                                OAuthProvider.GITHUB, "nonexistent", 1L, PredictionStatus.COMPLETED));

                assertEquals("User with OAuth provider 'github' and ID 'nonexistent' does not exist",
                                exception.getMessage());

                verify(userRepository).findByOauthProviderAndOauthId(OAuthProvider.GITHUB, "nonexistent");
                verifyNoInteractions(predictionRepository);
        }

        @Test
        void updatePrediction_PredictionDoesNotExist() {
                // Given
                when(userRepository.findByOauthProviderAndOauthId(OAuthProvider.GITHUB, "github123"))
                                .thenReturn(Optional.of(testUser));
                when(predictionRepository.findById(999L))
                                .thenReturn(Optional.empty());

                // When & Then
                PredictionDoesNotExistsException exception = assertThrows(PredictionDoesNotExistsException.class,
                                () -> predictionService.updatePrediction(
                                                OAuthProvider.GITHUB, "github123", 999L, PredictionStatus.COMPLETED));

                assertEquals("Prediction with ID '999' does not exist for user: testuser", exception.getMessage());

                verify(userRepository).findByOauthProviderAndOauthId(OAuthProvider.GITHUB, "github123");
                verify(predictionRepository).findById(999L);
                verify(predictionRepository, never()).save(any());
        }

        // Tests for getPrediction method

        @Test
        void getPrediction_Success() {
                // Given
                when(userRepository.findByOauthProviderAndOauthId(OAuthProvider.GITHUB, "github123"))
                                .thenReturn(Optional.of(testUser));
                when(predictionRepository.findById(1L))
                                .thenReturn(Optional.of(testPrediction));

                // When
                Prediction result = predictionService.getPrediction(OAuthProvider.GITHUB, "github123", 1L);

                // Then
                assertNotNull(result);
                assertEquals(1L, result.getId());
                assertEquals("Test Prediction", result.getName());
                assertEquals(testData, result.getData());
                assertEquals(testPredictionData, result.getPrediction());

                verify(userRepository).findByOauthProviderAndOauthId(OAuthProvider.GITHUB, "github123");
                verify(predictionRepository).findById(1L);
        }

        @Test
        void getPrediction_UserDoesNotExist() {
                // Given
                when(userRepository.findByOauthProviderAndOauthId(OAuthProvider.GITHUB, "nonexistent"))
                                .thenReturn(Optional.empty());

                // When & Then
                UserDoesNotExistException exception = assertThrows(UserDoesNotExistException.class,
                                () -> predictionService.getPrediction(OAuthProvider.GITHUB, "nonexistent", 1L));

                assertEquals("User with OAuth provider 'github' and ID 'nonexistent' does not exist",
                                exception.getMessage());

                verify(userRepository).findByOauthProviderAndOauthId(OAuthProvider.GITHUB, "nonexistent");
                verifyNoInteractions(predictionRepository);
        }

        @Test
        void getPrediction_PredictionDoesNotExist() {
                // Given
                when(userRepository.findByOauthProviderAndOauthId(OAuthProvider.GITHUB, "github123"))
                                .thenReturn(Optional.of(testUser));
                when(predictionRepository.findById(999L))
                                .thenReturn(Optional.empty());

                // When & Then
                PredictionDoesNotExistsException exception = assertThrows(PredictionDoesNotExistsException.class,
                                () -> predictionService.getPrediction(OAuthProvider.GITHUB, "github123", 999L));

                assertEquals("Prediction with ID '999' does not exist for user: testuser", exception.getMessage());

                verify(userRepository).findByOauthProviderAndOauthId(OAuthProvider.GITHUB, "github123");
                verify(predictionRepository).findById(999L);
        }

        // Tests for getPredictionsBySignatureId method

        @Test
        void getPredictionsBySignatureId_Success() {
                // Given
                Prediction prediction2 = new Prediction();
                prediction2.setId(2L);
                prediction2.setSignature(testSignature);
                prediction2.setName("Test Prediction 2");
                prediction2.setData(testData);
                prediction2.setPrediction(testPredictionData);
                prediction2.setStatus(PredictionStatus.COMPLETED);

                List<Prediction> expectedPredictions = List.of(testPrediction, prediction2);

                when(userRepository.findByOauthProviderAndOauthId(OAuthProvider.GITHUB, "github123"))
                                .thenReturn(Optional.of(testUser));
                when(signatureRepository.findByIdAndUserId(1L, 1L))
                                .thenReturn(Optional.of(testSignature));
                when(predictionRepository.findBySignatureId(1L))
                                .thenReturn(expectedPredictions);

                // When
                List<Prediction> result = predictionService.getPredictionsBySignatureId(
                                OAuthProvider.GITHUB, "github123", 1L);

                // Then
                assertNotNull(result);
                assertEquals(2, result.size());
                assertEquals("Test Prediction", result.get(0).getName());
                assertEquals("Test Prediction 2", result.get(1).getName());

                verify(userRepository).findByOauthProviderAndOauthId(OAuthProvider.GITHUB, "github123");
                verify(signatureRepository).findByIdAndUserId(1L, 1L);
                verify(predictionRepository).findBySignatureId(1L);
        }

        @Test
        void getPredictionsBySignatureId_UserDoesNotExist() {
                // Given
                when(userRepository.findByOauthProviderAndOauthId(OAuthProvider.GITHUB, "nonexistent"))
                                .thenReturn(Optional.empty());

                // When & Then
                UserDoesNotExistException exception = assertThrows(UserDoesNotExistException.class,
                                () -> predictionService.getPredictionsBySignatureId(OAuthProvider.GITHUB, "nonexistent",
                                                1L));

                assertEquals("User with OAuth provider 'github' and ID 'nonexistent' does not exist",
                                exception.getMessage());

                verify(userRepository).findByOauthProviderAndOauthId(OAuthProvider.GITHUB, "nonexistent");
                verifyNoInteractions(signatureRepository);
                verifyNoInteractions(predictionRepository);
        }

        @Test
        void getPredictionsBySignatureId_SignatureDoesNotExist() {
                // Given
                when(userRepository.findByOauthProviderAndOauthId(OAuthProvider.GITHUB, "github123"))
                                .thenReturn(Optional.of(testUser));
                when(signatureRepository.findByIdAndUserId(999L, 1L))
                                .thenReturn(Optional.empty());

                // When & Then
                SignatureDoesNotExistsException exception = assertThrows(SignatureDoesNotExistsException.class,
                                () -> predictionService.getPredictionsBySignatureId(OAuthProvider.GITHUB, "github123",
                                                999L));

                assertEquals("Signature with ID '999' does not exist.", exception.getMessage());

                verify(userRepository).findByOauthProviderAndOauthId(OAuthProvider.GITHUB, "github123");
                verify(signatureRepository).findByIdAndUserId(999L, 1L);
                verify(predictionRepository, never()).findBySignatureId(anyLong());
        }

        @Test
        void getPredictionsBySignatureId_EmptyList() {
                // Given
                when(userRepository.findByOauthProviderAndOauthId(OAuthProvider.GITHUB, "github123"))
                                .thenReturn(Optional.of(testUser));
                when(signatureRepository.findByIdAndUserId(1L, 1L))
                                .thenReturn(Optional.of(testSignature));
                when(predictionRepository.findBySignatureId(1L))
                                .thenReturn(List.of());

                // When
                List<Prediction> result = predictionService.getPredictionsBySignatureId(
                                OAuthProvider.GITHUB, "github123", 1L);

                // Then
                assertNotNull(result);
                assertTrue(result.isEmpty());

                verify(userRepository).findByOauthProviderAndOauthId(OAuthProvider.GITHUB, "github123");
                verify(signatureRepository).findByIdAndUserId(1L, 1L);
                verify(predictionRepository).findBySignatureId(1L);
        }
}
