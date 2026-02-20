/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.prediction;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;

import dev.ulloasp.mlsuite.model.entities.Model;
import dev.ulloasp.mlsuite.prediction.controllers.PredictionControllerImpl;
import dev.ulloasp.mlsuite.prediction.dtos.CreatePredictionParams;
import dev.ulloasp.mlsuite.prediction.dtos.PredictionDto;
import dev.ulloasp.mlsuite.prediction.dtos.UpdatePredictionParams;
import dev.ulloasp.mlsuite.prediction.entities.Prediction;
import dev.ulloasp.mlsuite.prediction.entities.PredictionStatus;
import dev.ulloasp.mlsuite.prediction.exceptions.PredictionAlreadyExistsException;
import dev.ulloasp.mlsuite.prediction.exceptions.PredictionDoesNotExistsException;
import dev.ulloasp.mlsuite.prediction.services.PredictionService;
import dev.ulloasp.mlsuite.signature.entities.Signature;
import dev.ulloasp.mlsuite.user.entity.OAuthProvider;
import dev.ulloasp.mlsuite.util.ErrorDto;
import jakarta.servlet.http.HttpServletRequest;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class PredictionControllerTest {

        @Mock
        private PredictionService predictionService;

        @Mock
        private OAuth2AuthenticationToken mockAuthentication;

        @Mock
        private OAuth2User mockOAuth2User;

        @Mock
        private HttpServletRequest mockRequest;

        @InjectMocks
        private PredictionControllerImpl predictionController;

        private Prediction testPrediction;
        private Signature testSignature;
        private Model testModel;
        private CreatePredictionParams testCreateParams;
        private UpdatePredictionParams testUpdateParams;
        private Map<String, Object> testInputs;
        private Map<String, Object> testPredictionData;

        @BeforeEach
        void setUp() {
                // Setup test model
                testModel = new Model();
                testModel.setId(1L);

                // Setup test signature
                testSignature = new Signature();
                testSignature.setId(1L);
                testSignature.setModel(testModel);
                testSignature.setName("Test Signature");

                // Setup test inputs and prediction data
                testInputs = new HashMap<>();
                testInputs.put("feature1", 10.5);
                testInputs.put("feature2", 20);
                testInputs.put("feature3", "category_a");

                testPredictionData = new HashMap<>();
                testPredictionData.put("result", 85.7);
                testPredictionData.put("confidence", 0.92);
                testPredictionData.put("classification", "positive");

                // Setup test prediction
                testPrediction = new Prediction();
                testPrediction.setId(1L);
                testPrediction.setSignature(testSignature);
                testPrediction.setName("Test Prediction");
                testPrediction.setData(testInputs);
                testPrediction.setPrediction(testPredictionData);
                testPrediction.setStatus(PredictionStatus.PENDING);
                testPrediction.setCreatedAt(OffsetDateTime.of(2024, 1, 15, 10, 30, 0, 0, ZoneOffset.UTC));
                testPrediction.setUpdatedAt(OffsetDateTime.of(2024, 1, 15, 10, 30, 0, 0, ZoneOffset.UTC));

                // Setup test create params
                testCreateParams = new CreatePredictionParams();
                testCreateParams.setSignatureId(1L);
                testCreateParams.setName("Test Prediction");
                testCreateParams.setInputs(testInputs);
                testCreateParams.setPrediction(testPredictionData);

                // Setup test update params
                testUpdateParams = new UpdatePredictionParams();
                testUpdateParams.setPredictionId(1L);
                testUpdateParams.setStatus("COMPLETED");

                // Setup mock request
                when(mockRequest.getRequestURI()).thenReturn("/api/prediction");
        }

        // Tests for createPrediction method

        @Test
        void createPrediction_Success_GitHubProvider() {
                // Given
                when(mockAuthentication.getAuthorizedClientRegistrationId()).thenReturn("github");
                when(mockAuthentication.getPrincipal()).thenReturn(mockOAuth2User);
                when(mockOAuth2User.getName()).thenReturn("github123");

                when(predictionService.createPrediction(
                                eq(OAuthProvider.GITHUB), eq("github123"), eq(1L), eq("Test Prediction"),
                                eq(testPredictionData), eq(testInputs)))
                                .thenReturn(testPrediction);

                // When
                ResponseEntity<PredictionDto> response = predictionController.createPrediction(mockAuthentication,
                                testCreateParams);

                // Then
                assertEquals(HttpStatus.CREATED, response.getStatusCode());
                assertNotNull(response.getBody());

                PredictionDto predictionDto = response.getBody();
                assertNotNull(predictionDto);
                assertEquals(1L, predictionDto.getId());
                assertEquals(1L, predictionDto.getSignatureId());
                assertEquals(1L, predictionDto.getModelId());
                assertEquals("Test Prediction", predictionDto.getName());
                assertEquals(testInputs, predictionDto.getInputs());
                assertEquals(testPredictionData, predictionDto.getPrediction());
                assertEquals(PredictionStatus.PENDING, predictionDto.getStatus());

                verify(predictionService).createPrediction(
                                eq(OAuthProvider.GITHUB), eq("github123"), eq(1L), eq("Test Prediction"),
                                eq(testPredictionData), eq(testInputs));
        }

        @Test
        void createPrediction_Success_GoogleProvider() {
                // Given
                when(mockAuthentication.getAuthorizedClientRegistrationId()).thenReturn("google");
                when(mockAuthentication.getPrincipal()).thenReturn(mockOAuth2User);
                when(mockOAuth2User.getName()).thenReturn("google456");

                when(predictionService.createPrediction(
                                eq(OAuthProvider.GOOGLE), eq("google456"), eq(1L), eq("Test Prediction"),
                                eq(testPredictionData), eq(testInputs)))
                                .thenReturn(testPrediction);

                // When
                ResponseEntity<PredictionDto> response = predictionController.createPrediction(mockAuthentication,
                                testCreateParams);

                // Then
                assertEquals(HttpStatus.CREATED, response.getStatusCode());
                assertNotNull(response.getBody());

                verify(predictionService).createPrediction(
                                eq(OAuthProvider.GOOGLE), eq("google456"), eq(1L), eq("Test Prediction"),
                                eq(testPredictionData), eq(testInputs));
        }

        @Test
        void createPrediction_Success_SystemProvider() {
                // Given
                when(mockAuthentication.getAuthorizedClientRegistrationId()).thenReturn("system");
                when(mockAuthentication.getPrincipal()).thenReturn(mockOAuth2User);
                when(mockOAuth2User.getName()).thenReturn("system789");

                when(predictionService.createPrediction(
                                eq(OAuthProvider.SYSTEM), eq("system789"), eq(1L), eq("Test Prediction"),
                                eq(testPredictionData), eq(testInputs)))
                                .thenReturn(testPrediction);

                // When
                ResponseEntity<PredictionDto> response = predictionController.createPrediction(mockAuthentication,
                                testCreateParams);

                // Then
                assertEquals(HttpStatus.CREATED, response.getStatusCode());
                assertNotNull(response.getBody());

                verify(predictionService).createPrediction(
                                eq(OAuthProvider.SYSTEM), eq("system789"), eq(1L), eq("Test Prediction"),
                                eq(testPredictionData), eq(testInputs));
        }

        @Test
        void createPrediction_PredictionAlreadyExistsException() {
                // Given
                when(mockAuthentication.getAuthorizedClientRegistrationId()).thenReturn("github");
                when(mockAuthentication.getPrincipal()).thenReturn(mockOAuth2User);
                when(mockOAuth2User.getName()).thenReturn("github123");

                PredictionAlreadyExistsException exception = new PredictionAlreadyExistsException("Test Prediction",
                                "Test Signature");
                when(predictionService.createPrediction(
                                eq(OAuthProvider.GITHUB), eq("github123"), eq(1L), eq("Test Prediction"),
                                eq(testPredictionData), eq(testInputs)))
                                .thenThrow(exception);

                // When & Then
                PredictionAlreadyExistsException thrownException = assertThrows(PredictionAlreadyExistsException.class,
                                () -> predictionController.createPrediction(mockAuthentication, testCreateParams));

                assertTrue(thrownException.getMessage()
                                .contains("Signature with name 'Test Signature' already has a prediction with name 'Test Prediction'"));

                verify(predictionService).createPrediction(
                                eq(OAuthProvider.GITHUB), eq("github123"), eq(1L), eq("Test Prediction"),
                                eq(testPredictionData), eq(testInputs));
        }

        // Tests for updatePrediction method

        @Test
        void updatePrediction_Success_ToCompleted() {
                // Given
                when(mockAuthentication.getAuthorizedClientRegistrationId()).thenReturn("github");
                when(mockAuthentication.getPrincipal()).thenReturn(mockOAuth2User);
                when(mockOAuth2User.getName()).thenReturn("github123");

                Prediction updatedPrediction = new Prediction();
                updatedPrediction.setId(1L);
                updatedPrediction.setSignature(testSignature);
                updatedPrediction.setName("Test Prediction");
                updatedPrediction.setData(testInputs);
                updatedPrediction.setPrediction(testPredictionData);
                updatedPrediction.setStatus(PredictionStatus.COMPLETED);
                updatedPrediction.setCreatedAt(OffsetDateTime.of(2024, 1, 15, 10, 30, 0, 0, ZoneOffset.UTC));
                updatedPrediction.setUpdatedAt(OffsetDateTime.of(2024, 1, 15, 12, 0, 0, 0, ZoneOffset.UTC));

                when(predictionService.updatePrediction(
                                eq(OAuthProvider.GITHUB), eq("github123"), eq(1L), eq(PredictionStatus.COMPLETED)))
                                .thenReturn(updatedPrediction);

                // When
                ResponseEntity<PredictionDto> response = predictionController.updatePrediction(mockAuthentication,
                                testUpdateParams);

                // Then
                assertEquals(HttpStatus.CREATED, response.getStatusCode());
                assertNotNull(response.getBody());

                PredictionDto predictionDto = response.getBody();
                assertNotNull(predictionDto);
                assertEquals(1L, predictionDto.getId());
                assertEquals(PredictionStatus.COMPLETED, predictionDto.getStatus());

                verify(predictionService).updatePrediction(
                                eq(OAuthProvider.GITHUB), eq("github123"), eq(1L), eq(PredictionStatus.COMPLETED));
        }

        @Test
        void updatePrediction_Success_ToFailed() {
                // Given
                when(mockAuthentication.getAuthorizedClientRegistrationId()).thenReturn("github");
                when(mockAuthentication.getPrincipal()).thenReturn(mockOAuth2User);
                when(mockOAuth2User.getName()).thenReturn("github123");

                testUpdateParams.setStatus("FAILED");

                Prediction updatedPrediction = new Prediction();
                updatedPrediction.setId(1L);
                updatedPrediction.setSignature(testSignature);
                updatedPrediction.setName("Test Prediction");
                updatedPrediction.setData(testInputs);
                updatedPrediction.setPrediction(testPredictionData);
                updatedPrediction.setStatus(PredictionStatus.FAILED);
                updatedPrediction.setCreatedAt(OffsetDateTime.of(2024, 1, 15, 10, 30, 0, 0, ZoneOffset.UTC));
                updatedPrediction.setUpdatedAt(OffsetDateTime.of(2024, 1, 15, 12, 0, 0, 0, ZoneOffset.UTC));

                when(predictionService.updatePrediction(
                                eq(OAuthProvider.GITHUB), eq("github123"), eq(1L), eq(PredictionStatus.FAILED)))
                                .thenReturn(updatedPrediction);

                // When
                ResponseEntity<PredictionDto> response = predictionController.updatePrediction(mockAuthentication,
                                testUpdateParams);

                // Then
                assertEquals(HttpStatus.CREATED, response.getStatusCode());
                assertNotNull(response.getBody());

                PredictionDto predictionDto = response.getBody();
                assertNotNull(predictionDto);
                assertEquals(PredictionStatus.FAILED, predictionDto.getStatus());

                verify(predictionService).updatePrediction(
                                eq(OAuthProvider.GITHUB), eq("github123"), eq(1L), eq(PredictionStatus.FAILED));
        }

        @Test
        void updatePrediction_Success_GoogleProvider() {
                // Given
                when(mockAuthentication.getAuthorizedClientRegistrationId()).thenReturn("google");
                when(mockAuthentication.getPrincipal()).thenReturn(mockOAuth2User);
                when(mockOAuth2User.getName()).thenReturn("google456");

                Prediction updatedPrediction = new Prediction();
                updatedPrediction.setId(1L);
                updatedPrediction.setSignature(testSignature);
                updatedPrediction.setName("Test Prediction");
                updatedPrediction.setData(testInputs);
                updatedPrediction.setPrediction(testPredictionData);
                updatedPrediction.setStatus(PredictionStatus.COMPLETED);

                when(predictionService.updatePrediction(
                                eq(OAuthProvider.GOOGLE), eq("google456"), eq(1L), eq(PredictionStatus.COMPLETED)))
                                .thenReturn(updatedPrediction);

                // When
                ResponseEntity<PredictionDto> response = predictionController.updatePrediction(mockAuthentication,
                                testUpdateParams);

                // Then
                assertEquals(HttpStatus.CREATED, response.getStatusCode());
                assertNotNull(response.getBody());

                verify(predictionService).updatePrediction(
                                eq(OAuthProvider.GOOGLE), eq("google456"), eq(1L), eq(PredictionStatus.COMPLETED));
        }

        @Test
        void updatePrediction_PredictionDoesNotExistsException() {
                // Given
                when(mockAuthentication.getAuthorizedClientRegistrationId()).thenReturn("github");
                when(mockAuthentication.getPrincipal()).thenReturn(mockOAuth2User);
                when(mockOAuth2User.getName()).thenReturn("github123");

                PredictionDoesNotExistsException exception = new PredictionDoesNotExistsException(999L, "github123");
                when(predictionService.updatePrediction(
                                eq(OAuthProvider.GITHUB), eq("github123"), eq(1L), eq(PredictionStatus.COMPLETED)))
                                .thenThrow(exception);

                // When & Then
                PredictionDoesNotExistsException thrownException = assertThrows(PredictionDoesNotExistsException.class,
                                () -> predictionController.updatePrediction(mockAuthentication, testUpdateParams));

                assertTrue(
                                thrownException.getMessage().contains(
                                                "Prediction with ID '999' does not exist for user: github123"));

                verify(predictionService).updatePrediction(
                                eq(OAuthProvider.GITHUB), eq("github123"), eq(1L), eq(PredictionStatus.COMPLETED));
        }

        // Tests for getAllPredictions method

        @Test
        void getAllPredictions_Success() {
                // Given
                when(mockAuthentication.getAuthorizedClientRegistrationId()).thenReturn("github");
                when(mockAuthentication.getPrincipal()).thenReturn(mockOAuth2User);
                when(mockOAuth2User.getName()).thenReturn("github123");

                Prediction prediction2 = new Prediction();
                prediction2.setId(2L);
                prediction2.setSignature(testSignature);
                prediction2.setName("Second Prediction");
                prediction2.setData(testInputs);
                prediction2.setPrediction(testPredictionData);
                prediction2.setStatus(PredictionStatus.COMPLETED);
                prediction2.setCreatedAt(OffsetDateTime.of(2024, 2, 15, 10, 30, 0, 0, ZoneOffset.UTC));
                prediction2.setUpdatedAt(OffsetDateTime.of(2024, 2, 15, 12, 0, 0, 0, ZoneOffset.UTC));

                List<Prediction> predictions = Arrays.asList(testPrediction, prediction2);
                when(predictionService.getPredictionsBySignatureId(eq(OAuthProvider.GITHUB), eq("github123"), eq(1L)))
                                .thenReturn(predictions);

                // When
                ResponseEntity<List<PredictionDto>> response = predictionController
                                .getAllPredictions(mockAuthentication, 1L);

                // Then
                assertEquals(HttpStatus.OK, response.getStatusCode());
                assertNotNull(response.getBody());

                List<PredictionDto> predictionDtos = response.getBody();
                assertNotNull(predictionDtos);
                assertEquals(2, predictionDtos.size());

                PredictionDto firstDto = predictionDtos.get(0);
                assertEquals(1L, firstDto.getId());
                assertEquals("Test Prediction", firstDto.getName());
                assertEquals(PredictionStatus.PENDING, firstDto.getStatus());

                PredictionDto secondDto = predictionDtos.get(1);
                assertEquals(2L, secondDto.getId());
                assertEquals("Second Prediction", secondDto.getName());
                assertEquals(PredictionStatus.COMPLETED, secondDto.getStatus());

                verify(predictionService).getPredictionsBySignatureId(eq(OAuthProvider.GITHUB), eq("github123"),
                                eq(1L));
        }

        @Test
        void getAllPredictions_Success_EmptyList() {
                // Given
                when(mockAuthentication.getAuthorizedClientRegistrationId()).thenReturn("github");
                when(mockAuthentication.getPrincipal()).thenReturn(mockOAuth2User);
                when(mockOAuth2User.getName()).thenReturn("github123");

                when(predictionService.getPredictionsBySignatureId(eq(OAuthProvider.GITHUB), eq("github123"), eq(999L)))
                                .thenReturn(Arrays.asList());

                // When
                ResponseEntity<List<PredictionDto>> response = predictionController
                                .getAllPredictions(mockAuthentication, 999L);

                // Then
                assertEquals(HttpStatus.OK, response.getStatusCode());
                assertNotNull(response.getBody());

                List<PredictionDto> predictionDtos = response.getBody();
                assertNotNull(predictionDtos);
                assertTrue(predictionDtos.isEmpty());

                verify(predictionService).getPredictionsBySignatureId(eq(OAuthProvider.GITHUB), eq("github123"),
                                eq(999L));
        }

        @Test
        void getAllPredictions_Success_SystemProvider() {
                // Given
                when(mockAuthentication.getAuthorizedClientRegistrationId()).thenReturn("system");
                when(mockAuthentication.getPrincipal()).thenReturn(mockOAuth2User);
                when(mockOAuth2User.getName()).thenReturn("system789");

                List<Prediction> predictions = Arrays.asList(testPrediction);
                when(predictionService.getPredictionsBySignatureId(eq(OAuthProvider.SYSTEM), eq("system789"), eq(1L)))
                                .thenReturn(predictions);

                // When
                ResponseEntity<List<PredictionDto>> response = predictionController
                                .getAllPredictions(mockAuthentication, 1L);

                // Then
                assertEquals(HttpStatus.OK, response.getStatusCode());
                assertNotNull(response.getBody());

                List<PredictionDto> predictionDtos = response.getBody();
                assertNotNull(predictionDtos);
                assertEquals(1, predictionDtos.size());

                verify(predictionService).getPredictionsBySignatureId(eq(OAuthProvider.SYSTEM), eq("system789"),
                                eq(1L));
        }

        // Tests for exception handlers

        @Test
        void handlePredictionAlreadyExistsException_ReturnsConflict() {
                // Given
                PredictionAlreadyExistsException exception = new PredictionAlreadyExistsException("Test Prediction",
                                "Test Signature");
                when(mockRequest.getRequestURI()).thenReturn("/api/prediction/create");

                // When
                ResponseEntity<ErrorDto> response = predictionController.handlePredictionAlreadyExistsException(
                                exception,
                                mockRequest);

                // Then
                assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
                assertNotNull(response.getBody());

                ErrorDto errorDto = response.getBody();
                assertNotNull(errorDto);
                assertEquals(409, errorDto.status());
                assertTrue(errorDto.message()
                                .contains("Signature with name 'Test Signature' already has a prediction with name 'Test Prediction'"));
                assertEquals("/api/prediction/create", errorDto.path());
                assertNotNull(errorDto.timestamp());
        }

        @Test
        void handlePredictionDoesNotExistsException_ReturnsNotFound() {
                // Given
                PredictionDoesNotExistsException exception = new PredictionDoesNotExistsException(999L, "github123");
                when(mockRequest.getRequestURI()).thenReturn("/api/prediction/update");

                // When
                ResponseEntity<ErrorDto> response = predictionController.handlePredictionDoesNotExistsException(
                                exception,
                                mockRequest);

                // Then
                assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
                assertNotNull(response.getBody());

                ErrorDto errorDto = response.getBody();
                assertNotNull(errorDto);
                assertEquals(404, errorDto.status());
                assertEquals("Prediction with ID '999' does not exist for user: github123", errorDto.message());
                assertEquals("/api/prediction/update", errorDto.path());
                assertNotNull(errorDto.timestamp());
        }

        // Additional tests for different scenarios

        @Test
        void createPrediction_DifferentInputData() {
                // Given
                when(mockAuthentication.getAuthorizedClientRegistrationId()).thenReturn("github");
                when(mockAuthentication.getPrincipal()).thenReturn(mockOAuth2User);
                when(mockOAuth2User.getName()).thenReturn("github123");

                Map<String, Object> differentInputs = new HashMap<>();
                differentInputs.put("numerical_feature", 42.7);
                differentInputs.put("categorical_feature", "type_b");
                differentInputs.put("boolean_feature", true);

                Map<String, Object> differentPrediction = new HashMap<>();
                differentPrediction.put("probability", 0.78);
                differentPrediction.put("class", "negative");

                testCreateParams.setInputs(differentInputs);
                testCreateParams.setPrediction(differentPrediction);
                testPrediction.setData(differentInputs);
                testPrediction.setPrediction(differentPrediction);

                when(predictionService.createPrediction(
                                eq(OAuthProvider.GITHUB), eq("github123"), eq(1L), eq("Test Prediction"),
                                eq(differentPrediction), eq(differentInputs)))
                                .thenReturn(testPrediction);

                // When
                ResponseEntity<PredictionDto> response = predictionController.createPrediction(mockAuthentication,
                                testCreateParams);

                // Then
                assertEquals(HttpStatus.CREATED, response.getStatusCode());
                assertNotNull(response.getBody());

                PredictionDto predictionDto = response.getBody();
                assertNotNull(predictionDto);
                assertEquals(differentInputs, predictionDto.getInputs());
                assertEquals(differentPrediction, predictionDto.getPrediction());

                verify(predictionService).createPrediction(
                                eq(OAuthProvider.GITHUB), eq("github123"), eq(1L), eq("Test Prediction"),
                                eq(differentPrediction), eq(differentInputs));
        }

        @Test
        void updatePrediction_AllStatusValues() {
                // Given
                when(mockAuthentication.getAuthorizedClientRegistrationId()).thenReturn("github");
                when(mockAuthentication.getPrincipal()).thenReturn(mockOAuth2User);
                when(mockOAuth2User.getName()).thenReturn("github123");

                PredictionStatus[] statuses = { PredictionStatus.PENDING, PredictionStatus.COMPLETED,
                                PredictionStatus.FAILED };
                String[] statusStrings = { "PENDING", "COMPLETED", "FAILED" };

                for (int i = 0; i < statuses.length; i++) {
                        testUpdateParams.setStatus(statusStrings[i]);

                        Prediction updatedPrediction = new Prediction();
                        updatedPrediction.setId(1L);
                        updatedPrediction.setSignature(testSignature);
                        updatedPrediction.setStatus(statuses[i]);

                        when(predictionService.updatePrediction(
                                        eq(OAuthProvider.GITHUB), eq("github123"), eq(1L), eq(statuses[i])))
                                        .thenReturn(updatedPrediction);

                        // When
                        ResponseEntity<PredictionDto> response = predictionController.updatePrediction(
                                        mockAuthentication,
                                        testUpdateParams);

                        // Then
                        assertEquals(HttpStatus.CREATED, response.getStatusCode());
                        assertNotNull(response.getBody());

                        PredictionDto predictionDto = response.getBody();
                        assertNotNull(predictionDto);
                        assertEquals(statuses[i], predictionDto.getStatus());

                        verify(predictionService).updatePrediction(
                                        eq(OAuthProvider.GITHUB), eq("github123"), eq(1L), eq(statuses[i]));
                }
        }

        @Test
        void getAllPredictions_DifferentSignatureIds() {
                // Given
                when(mockAuthentication.getAuthorizedClientRegistrationId()).thenReturn("github");
                when(mockAuthentication.getPrincipal()).thenReturn(mockOAuth2User);
                when(mockOAuth2User.getName()).thenReturn("github123");

                Long[] signatureIds = { 1L, 5L, 100L };

                for (Long signatureId : signatureIds) {
                        when(predictionService.getPredictionsBySignatureId(eq(OAuthProvider.GITHUB), eq("github123"),
                                        eq(signatureId)))
                                        .thenReturn(Arrays.asList(testPrediction));

                        // When
                        ResponseEntity<List<PredictionDto>> response = predictionController.getAllPredictions(
                                        mockAuthentication,
                                        signatureId);

                        // Then
                        assertEquals(HttpStatus.OK, response.getStatusCode());
                        assertNotNull(response.getBody());

                        List<PredictionDto> predictionDtos = response.getBody();
                        assertNotNull(predictionDtos);
                        assertEquals(1, predictionDtos.size());

                        verify(predictionService).getPredictionsBySignatureId(eq(OAuthProvider.GITHUB), eq("github123"),
                                        eq(signatureId));
                }
        }
}
