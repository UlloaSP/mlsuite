/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.prediction;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
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

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import dev.ulloasp.mlsuite.model.entities.Model;
import dev.ulloasp.mlsuite.prediction.entities.Prediction;
import dev.ulloasp.mlsuite.prediction.entities.PredictionStatus;
import dev.ulloasp.mlsuite.prediction.entities.Target;
import dev.ulloasp.mlsuite.prediction.exceptions.PredictionDoesNotExistsException;
import dev.ulloasp.mlsuite.prediction.exceptions.TargetDoesNotExistsException;
import dev.ulloasp.mlsuite.prediction.repositories.PredictionRepository;
import dev.ulloasp.mlsuite.prediction.repositories.TargetRepository;
import dev.ulloasp.mlsuite.prediction.services.TargetServiceImpl;
import dev.ulloasp.mlsuite.signature.entities.Signature;
import dev.ulloasp.mlsuite.user.entity.OAuthProvider;
import dev.ulloasp.mlsuite.user.entity.User;
import dev.ulloasp.mlsuite.user.exceptions.UserDoesNotExistException;
import dev.ulloasp.mlsuite.user.repository.UserRepository;

@ExtendWith(MockitoExtension.class)
class TargetServiceTest {

        @Mock
        private UserRepository userRepository;

        @Mock
        private TargetRepository targetRepository;

        @Mock
        private PredictionRepository predictionRepository;

        @InjectMocks
        private TargetServiceImpl targetService;

        private ObjectMapper objectMapper = new ObjectMapper();
        private User testUser;
        private Model testModel;
        private Signature testSignature;
        private Prediction testPrediction;
        private Target testTarget;
        private JsonNode testValue;
        private JsonNode testRealValue;

        @BeforeEach
        void setUp() throws Exception {
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

                Map<String, Object> data = new HashMap<>();
                data.put("feature1", 1.5);
                data.put("feature2", 10);

                Map<String, Object> predictionData = new HashMap<>();
                predictionData.put("class", "positive");
                predictionData.put("probability", 0.85);

                testPrediction = new Prediction();
                testPrediction.setId(1L);
                testPrediction.setSignature(testSignature);
                testPrediction.setName("Test Prediction");
                testPrediction.setData(data);
                testPrediction.setPrediction(predictionData);
                testPrediction.setStatus(PredictionStatus.PENDING);
                testPrediction.setCreatedAt(OffsetDateTime.now());
                testPrediction.setUpdatedAt(OffsetDateTime.now());

                // Create JsonNode objects for test values
                testValue = objectMapper.valueToTree("predicted_value");
                testRealValue = objectMapper.valueToTree("actual_value");

                testTarget = new Target();
                testTarget.setId(1L);
                testTarget.setPrediction(testPrediction);
                testTarget.setOrder(0);
                testTarget.setValue(testValue);
                testTarget.setRealValue(null);
                testTarget.setCreatedAt(OffsetDateTime.now());
                testTarget.setUpdatedAt(OffsetDateTime.now());
        }

        // Tests for createTarget method

        @Test
        void createTarget_Success() {
                // Given
                when(userRepository.findByOauthProviderAndOauthId(OAuthProvider.GITHUB, "github123"))
                                .thenReturn(Optional.of(testUser));
                when(predictionRepository.findByIdAndUserId(1L, 1L))
                                .thenReturn(Optional.of(testPrediction));
                when(targetRepository.save(any(Target.class)))
                                .thenReturn(testTarget);

                // When
                Target result = targetService.createTarget(
                                OAuthProvider.GITHUB, "github123", 1L, 0, testValue);

                // Then
                assertNotNull(result);
                assertEquals(1L, result.getId());
                assertEquals(testPrediction, result.getPrediction());
                assertEquals(0, result.getOrder());
                assertEquals(testValue, result.getValue());

                verify(userRepository).findByOauthProviderAndOauthId(OAuthProvider.GITHUB, "github123");
                verify(predictionRepository).findByIdAndUserId(1L, 1L);
                verify(targetRepository).save(any(Target.class));
        }

        @Test
        void createTarget_UserDoesNotExist() {
                // Given
                when(userRepository.findByOauthProviderAndOauthId(OAuthProvider.GITHUB, "nonexistent"))
                                .thenReturn(Optional.empty());

                // When & Then
                UserDoesNotExistException exception = assertThrows(UserDoesNotExistException.class,
                                () -> targetService.createTarget(
                                                OAuthProvider.GITHUB, "nonexistent", 1L, 0, testValue));

                assertEquals("User with OAuth provider 'github' and ID 'nonexistent' does not exist",
                                exception.getMessage());

                verify(userRepository).findByOauthProviderAndOauthId(OAuthProvider.GITHUB, "nonexistent");
                verifyNoInteractions(predictionRepository);
                verifyNoInteractions(targetRepository);
        }

        @Test
        void createTarget_PredictionDoesNotExist() {
                // Given
                when(userRepository.findByOauthProviderAndOauthId(OAuthProvider.GITHUB, "github123"))
                                .thenReturn(Optional.of(testUser));
                when(predictionRepository.findByIdAndUserId(999L, 1L))
                                .thenReturn(Optional.empty());

                // When & Then
                PredictionDoesNotExistsException exception = assertThrows(PredictionDoesNotExistsException.class,
                                () -> targetService.createTarget(
                                                OAuthProvider.GITHUB, "github123", 999L, 0, testValue));

                assertEquals("Prediction with ID '999' does not exist for user: testuser", exception.getMessage());

                verify(userRepository).findByOauthProviderAndOauthId(OAuthProvider.GITHUB, "github123");
                verify(predictionRepository).findByIdAndUserId(999L, 1L);
                verify(targetRepository, never()).save(any());
        }

        // Tests for updateTarget method

        @Test
        void updateTarget_Success() {
                // Given
                when(userRepository.findByOauthProviderAndOauthId(OAuthProvider.GITHUB, "github123"))
                                .thenReturn(Optional.of(testUser));
                when(targetRepository.findByIdAndUserId(1L, 1L))
                                .thenReturn(Optional.of(testTarget));

                Target updatedTarget = new Target();
                updatedTarget.setId(1L);
                updatedTarget.setPrediction(testPrediction);
                updatedTarget.setOrder(0);
                updatedTarget.setValue(testValue);
                updatedTarget.setRealValue(testRealValue);

                when(targetRepository.save(testTarget))
                                .thenReturn(updatedTarget);

                // When
                Target result = targetService.updateTarget(
                                OAuthProvider.GITHUB, "github123", 1L, testRealValue);

                // Then
                assertNotNull(result);
                assertEquals(1L, result.getId());
                assertEquals(testRealValue, result.getRealValue());

                verify(userRepository).findByOauthProviderAndOauthId(OAuthProvider.GITHUB, "github123");
                verify(targetRepository).findByIdAndUserId(1L, 1L);
                verify(targetRepository).save(testTarget);

                // Verify that the real value was set on the original target
                assertEquals(testRealValue, testTarget.getRealValue());
        }

        @Test
        void updateTarget_UserDoesNotExist() {
                // Given
                when(userRepository.findByOauthProviderAndOauthId(OAuthProvider.GITHUB, "nonexistent"))
                                .thenReturn(Optional.empty());

                // When & Then
                UserDoesNotExistException exception = assertThrows(UserDoesNotExistException.class,
                                () -> targetService.updateTarget(
                                                OAuthProvider.GITHUB, "nonexistent", 1L, testRealValue));

                assertEquals("User with OAuth provider 'github' and ID 'nonexistent' does not exist",
                                exception.getMessage());

                verify(userRepository).findByOauthProviderAndOauthId(OAuthProvider.GITHUB, "nonexistent");
                verifyNoInteractions(targetRepository);
        }

        @Test
        void updateTarget_TargetDoesNotExist() {
                // Given
                when(userRepository.findByOauthProviderAndOauthId(OAuthProvider.GITHUB, "github123"))
                                .thenReturn(Optional.of(testUser));
                when(targetRepository.findByIdAndUserId(999L, 1L))
                                .thenReturn(Optional.empty());

                // When & Then
                TargetDoesNotExistsException exception = assertThrows(TargetDoesNotExistsException.class,
                                () -> targetService.updateTarget(
                                                OAuthProvider.GITHUB, "github123", 999L, testRealValue));

                assertEquals("Target with ID '999' does not exist for user: testuser", exception.getMessage());

                verify(userRepository).findByOauthProviderAndOauthId(OAuthProvider.GITHUB, "github123");
                verify(targetRepository).findByIdAndUserId(999L, 1L);
                verify(targetRepository, never()).save(any());
        }

        // Tests for getTargetsByPredictionId method

        @Test
        void getTargetsByPredictionId_Success() throws Exception {
                // Given
                Target target2 = new Target();
                target2.setId(2L);
                target2.setPrediction(testPrediction);
                target2.setOrder(1);
                target2.setValue(objectMapper.valueToTree("predicted_value_2"));
                target2.setRealValue(objectMapper.valueToTree("actual_value_2"));

                List<Target> expectedTargets = List.of(testTarget, target2);

                when(userRepository.findByOauthProviderAndOauthId(OAuthProvider.GITHUB, "github123"))
                                .thenReturn(Optional.of(testUser));
                when(predictionRepository.findByIdAndUserId(1L, 1L))
                                .thenReturn(Optional.of(testPrediction));
                when(targetRepository.findByPredictionId(1L))
                                .thenReturn(expectedTargets);

                // When
                List<Target> result = targetService.getTargetsByPredictionId(
                                OAuthProvider.GITHUB, "github123", 1L);

                // Then
                assertNotNull(result);
                assertEquals(2, result.size());
                assertEquals(testTarget.getId(), result.get(0).getId());
                assertEquals(target2.getId(), result.get(1).getId());
                assertEquals(0, result.get(0).getOrder());
                assertEquals(1, result.get(1).getOrder());

                verify(userRepository).findByOauthProviderAndOauthId(OAuthProvider.GITHUB, "github123");
                verify(predictionRepository).findByIdAndUserId(1L, 1L);
                verify(targetRepository).findByPredictionId(1L);
        }

        @Test
        void getTargetsByPredictionId_UserDoesNotExist() {
                // Given
                when(userRepository.findByOauthProviderAndOauthId(OAuthProvider.GITHUB, "nonexistent"))
                                .thenReturn(Optional.empty());

                // When & Then
                UserDoesNotExistException exception = assertThrows(UserDoesNotExistException.class,
                                () -> targetService.getTargetsByPredictionId(OAuthProvider.GITHUB, "nonexistent", 1L));

                assertEquals("User with OAuth provider 'github' and ID 'nonexistent' does not exist",
                                exception.getMessage());

                verify(userRepository).findByOauthProviderAndOauthId(OAuthProvider.GITHUB, "nonexistent");
                verifyNoInteractions(predictionRepository);
                verifyNoInteractions(targetRepository);
        }

        @Test
        void getTargetsByPredictionId_PredictionDoesNotExist() {
                // Given
                when(userRepository.findByOauthProviderAndOauthId(OAuthProvider.GITHUB, "github123"))
                                .thenReturn(Optional.of(testUser));
                when(predictionRepository.findByIdAndUserId(999L, 1L))
                                .thenReturn(Optional.empty());

                // When & Then
                PredictionDoesNotExistsException exception = assertThrows(PredictionDoesNotExistsException.class,
                                () -> targetService.getTargetsByPredictionId(OAuthProvider.GITHUB, "github123", 999L));

                assertEquals("Prediction with ID '999' does not exist for user: testuser", exception.getMessage());

                verify(userRepository).findByOauthProviderAndOauthId(OAuthProvider.GITHUB, "github123");
                verify(predictionRepository).findByIdAndUserId(999L, 1L);
                verify(targetRepository, never()).findByPredictionId(anyLong());
        }

        @Test
        void getTargetsByPredictionId_EmptyList() {
                // Given
                when(userRepository.findByOauthProviderAndOauthId(OAuthProvider.GITHUB, "github123"))
                                .thenReturn(Optional.of(testUser));
                when(predictionRepository.findByIdAndUserId(1L, 1L))
                                .thenReturn(Optional.of(testPrediction));
                when(targetRepository.findByPredictionId(1L))
                                .thenReturn(List.of());

                // When
                List<Target> result = targetService.getTargetsByPredictionId(
                                OAuthProvider.GITHUB, "github123", 1L);

                // Then
                assertNotNull(result);
                assertTrue(result.isEmpty());

                verify(userRepository).findByOauthProviderAndOauthId(OAuthProvider.GITHUB, "github123");
                verify(predictionRepository).findByIdAndUserId(1L, 1L);
                verify(targetRepository).findByPredictionId(1L);
        }

        @Test
        void createTarget_WithDifferentOrderValues() {
                // Given
                when(userRepository.findByOauthProviderAndOauthId(OAuthProvider.GITHUB, "github123"))
                                .thenReturn(Optional.of(testUser));
                when(predictionRepository.findByIdAndUserId(1L, 1L))
                                .thenReturn(Optional.of(testPrediction));

                Target targetWithOrder5 = new Target();
                targetWithOrder5.setId(2L);
                targetWithOrder5.setPrediction(testPrediction);
                targetWithOrder5.setOrder(5);
                targetWithOrder5.setValue(testValue);

                when(targetRepository.save(any(Target.class)))
                                .thenReturn(targetWithOrder5);

                // When
                Target result = targetService.createTarget(
                                OAuthProvider.GITHUB, "github123", 1L, 5, testValue);

                // Then
                assertNotNull(result);
                assertEquals(5, result.getOrder());
                assertEquals(testValue, result.getValue());

                verify(userRepository).findByOauthProviderAndOauthId(OAuthProvider.GITHUB, "github123");
                verify(predictionRepository).findByIdAndUserId(1L, 1L);
                verify(targetRepository).save(any(Target.class));
        }

        @Test
        void updateTarget_WithNullRealValue() {
                // Given
                when(userRepository.findByOauthProviderAndOauthId(OAuthProvider.GITHUB, "github123"))
                                .thenReturn(Optional.of(testUser));
                when(targetRepository.findByIdAndUserId(1L, 1L))
                                .thenReturn(Optional.of(testTarget));

                Target updatedTarget = new Target();
                updatedTarget.setId(1L);
                updatedTarget.setPrediction(testPrediction);
                updatedTarget.setOrder(0);
                updatedTarget.setValue(testValue);
                updatedTarget.setRealValue(null);

                when(targetRepository.save(testTarget))
                                .thenReturn(updatedTarget);

                // When
                Target result = targetService.updateTarget(
                                OAuthProvider.GITHUB, "github123", 1L, null);

                // Then
                assertNotNull(result);
                assertEquals(1L, result.getId());
                assertNull(result.getRealValue());

                verify(userRepository).findByOauthProviderAndOauthId(OAuthProvider.GITHUB, "github123");
                verify(targetRepository).findByIdAndUserId(1L, 1L);
                verify(targetRepository).save(testTarget);

                // Verify that the real value was set to null on the original target
                assertNull(testTarget.getRealValue());
        }
}
