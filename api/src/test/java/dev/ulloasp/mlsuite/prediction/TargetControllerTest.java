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
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
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

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import dev.ulloasp.mlsuite.model.entities.Model;
import dev.ulloasp.mlsuite.prediction.controllers.TargetControllerImpl;
import dev.ulloasp.mlsuite.prediction.dtos.CreateTargetParams;
import dev.ulloasp.mlsuite.prediction.dtos.TargetDto;
import dev.ulloasp.mlsuite.prediction.dtos.UpdateTargetParams;
import dev.ulloasp.mlsuite.prediction.entities.Prediction;
import dev.ulloasp.mlsuite.prediction.entities.PredictionStatus;
import dev.ulloasp.mlsuite.prediction.entities.Target;
import dev.ulloasp.mlsuite.prediction.exceptions.TargetDoesNotExistsException;
import dev.ulloasp.mlsuite.prediction.services.TargetService;
import dev.ulloasp.mlsuite.signature.entities.Signature;
import dev.ulloasp.mlsuite.user.entity.OAuthProvider;
import dev.ulloasp.mlsuite.util.ErrorDto;
import jakarta.servlet.http.HttpServletRequest;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class TargetControllerTest {

        @Mock
        private TargetService targetService;

        @Mock
        private OAuth2AuthenticationToken mockAuthentication;

        @Mock
        private OAuth2User mockOAuth2User;

        @Mock
        private HttpServletRequest mockRequest;

        @InjectMocks
        private TargetControllerImpl targetController;

        private Target testTarget;
        private Prediction testPrediction;
        private Signature testSignature;
        private Model testModel;
        private CreateTargetParams testCreateParams;
        private UpdateTargetParams testUpdateParams;
        private JsonNode testValue;
        private JsonNode testRealValue;
        private ObjectMapper objectMapper;

        @BeforeEach
        void setUp() throws Exception {
                objectMapper = new ObjectMapper();

                // Setup test model
                testModel = new Model();
                testModel.setId(1L);

                // Setup test signature
                testSignature = new Signature();
                testSignature.setId(1L);
                testSignature.setModel(testModel);
                testSignature.setName("Test Signature");

                // Setup test prediction
                Map<String, Object> predictionInputs = new HashMap<>();
                predictionInputs.put("feature1", 10.5);
                predictionInputs.put("feature2", 20);

                Map<String, Object> predictionData = new HashMap<>();
                predictionData.put("result", 85.7);
                predictionData.put("confidence", 0.92);

                testPrediction = new Prediction();
                testPrediction.setId(1L);
                testPrediction.setSignature(testSignature);
                testPrediction.setName("Test Prediction");
                testPrediction.setData(predictionInputs);
                testPrediction.setPrediction(predictionData);
                testPrediction.setStatus(PredictionStatus.COMPLETED);

                // Setup test JsonNode values
                testValue = objectMapper.readTree("{\"predicted\": 85.7, \"class\": \"positive\"}");
                testRealValue = objectMapper.readTree("{\"actual\": 88.2, \"class\": \"positive\"}");

                // Setup test target
                testTarget = new Target();
                testTarget.setId(1L);
                testTarget.setPrediction(testPrediction);
                testTarget.setOrder(1);
                testTarget.setValue(testValue);
                testTarget.setRealValue(null);
                testTarget.setCreatedAt(OffsetDateTime.of(2024, 1, 15, 10, 30, 0, 0, ZoneOffset.UTC));
                testTarget.setUpdatedAt(OffsetDateTime.of(2024, 1, 15, 10, 30, 0, 0, ZoneOffset.UTC));

                // Setup test create params
                testCreateParams = new CreateTargetParams();
                testCreateParams.setPredictionId(1L);
                testCreateParams.setOrder(1);
                testCreateParams.setValue(testValue);

                // Setup test update params
                testUpdateParams = new UpdateTargetParams();
                testUpdateParams.setTargetId(1L);
                testUpdateParams.setRealValue(testRealValue);

                // Setup mock request
                when(mockRequest.getRequestURI()).thenReturn("/api/target");
        }

        // Tests for createTarget method

        @Test
        void createTarget_Success_GitHubProvider() {
                // Given
                when(mockAuthentication.getAuthorizedClientRegistrationId()).thenReturn("github");
                when(mockAuthentication.getPrincipal()).thenReturn(mockOAuth2User);
                when(mockOAuth2User.getName()).thenReturn("github123");

                when(targetService.createTarget(
                                eq(OAuthProvider.GITHUB), eq("github123"), eq(1L), eq(1), eq(testValue)))
                                .thenReturn(testTarget);

                // When
                ResponseEntity<TargetDto> response = targetController.createTarget(mockAuthentication,
                                testCreateParams);

                // Then
                assertEquals(HttpStatus.CREATED, response.getStatusCode());
                assertNotNull(response.getBody());

                TargetDto targetDto = response.getBody();
                assertNotNull(targetDto);
                assertEquals(1L, targetDto.getId());
                assertEquals(1L, targetDto.getPredictionId());
                assertEquals(1, targetDto.getOrder());
                assertEquals(testValue, targetDto.getValue());
                assertNull(targetDto.getRealValue());

                verify(targetService).createTarget(
                                eq(OAuthProvider.GITHUB), eq("github123"), eq(1L), eq(1), eq(testValue));
        }

        @Test
        void createTarget_Success_GoogleProvider() {
                // Given
                when(mockAuthentication.getAuthorizedClientRegistrationId()).thenReturn("google");
                when(mockAuthentication.getPrincipal()).thenReturn(mockOAuth2User);
                when(mockOAuth2User.getName()).thenReturn("google456");

                when(targetService.createTarget(
                                eq(OAuthProvider.GOOGLE), eq("google456"), eq(1L), eq(1), eq(testValue)))
                                .thenReturn(testTarget);

                // When
                ResponseEntity<TargetDto> response = targetController.createTarget(mockAuthentication,
                                testCreateParams);

                // Then
                assertEquals(HttpStatus.CREATED, response.getStatusCode());
                assertNotNull(response.getBody());

                verify(targetService).createTarget(
                                eq(OAuthProvider.GOOGLE), eq("google456"), eq(1L), eq(1), eq(testValue));
        }

        @Test
        void createTarget_Success_SystemProvider() {
                // Given
                when(mockAuthentication.getAuthorizedClientRegistrationId()).thenReturn("system");
                when(mockAuthentication.getPrincipal()).thenReturn(mockOAuth2User);
                when(mockOAuth2User.getName()).thenReturn("system789");

                when(targetService.createTarget(
                                eq(OAuthProvider.SYSTEM), eq("system789"), eq(1L), eq(1), eq(testValue)))
                                .thenReturn(testTarget);

                // When
                ResponseEntity<TargetDto> response = targetController.createTarget(mockAuthentication,
                                testCreateParams);

                // Then
                assertEquals(HttpStatus.CREATED, response.getStatusCode());
                assertNotNull(response.getBody());

                verify(targetService).createTarget(
                                eq(OAuthProvider.SYSTEM), eq("system789"), eq(1L), eq(1), eq(testValue));
        }

        @Test
        void createTarget_Success_DifferentOrders() throws Exception {
                // Given
                when(mockAuthentication.getAuthorizedClientRegistrationId()).thenReturn("github");
                when(mockAuthentication.getPrincipal()).thenReturn(mockOAuth2User);
                when(mockOAuth2User.getName()).thenReturn("github123");

                int[] orders = { 0, 1, 5, 10 };

                for (int order : orders) {
                        testCreateParams.setOrder(order);
                        testTarget.setOrder(order);

                        when(targetService.createTarget(
                                        eq(OAuthProvider.GITHUB), eq("github123"), eq(1L), eq(order), eq(testValue)))
                                        .thenReturn(testTarget);

                        // When
                        ResponseEntity<TargetDto> response = targetController.createTarget(mockAuthentication,
                                        testCreateParams);

                        // Then
                        assertEquals(HttpStatus.CREATED, response.getStatusCode());
                        assertNotNull(response.getBody());

                        TargetDto targetDto = response.getBody();
                        assertNotNull(targetDto);
                        assertEquals(order, targetDto.getOrder());

                        verify(targetService).createTarget(
                                        eq(OAuthProvider.GITHUB), eq("github123"), eq(1L), eq(order), eq(testValue));
                }
        }

        @Test
        void createTarget_Success_DifferentJsonValues() throws Exception {
                // Given
                when(mockAuthentication.getAuthorizedClientRegistrationId()).thenReturn("github");
                when(mockAuthentication.getPrincipal()).thenReturn(mockOAuth2User);
                when(mockOAuth2User.getName()).thenReturn("github123");

                // Test different JSON structures
                JsonNode numericValue = objectMapper.readTree("42.5");
                JsonNode stringValue = objectMapper.readTree("\"classification_result\"");
                JsonNode arrayValue = objectMapper.readTree("[1, 2, 3, 4, 5]");
                JsonNode booleanValue = objectMapper.readTree("true");

                JsonNode[] values = { numericValue, stringValue, arrayValue, booleanValue };

                for (JsonNode value : values) {
                        testCreateParams.setValue(value);
                        testTarget.setValue(value);

                        when(targetService.createTarget(
                                        eq(OAuthProvider.GITHUB), eq("github123"), eq(1L), eq(1), eq(value)))
                                        .thenReturn(testTarget);

                        // When
                        ResponseEntity<TargetDto> response = targetController.createTarget(mockAuthentication,
                                        testCreateParams);

                        // Then
                        assertEquals(HttpStatus.CREATED, response.getStatusCode());
                        assertNotNull(response.getBody());

                        TargetDto targetDto = response.getBody();
                        assertNotNull(targetDto);
                        assertEquals(value, targetDto.getValue());

                        verify(targetService).createTarget(
                                        eq(OAuthProvider.GITHUB), eq("github123"), eq(1L), eq(1), eq(value));
                }
        }

        // Tests for updateTarget method

        @Test
        void updateTarget_Success_GitHubProvider() {
                // Given
                when(mockAuthentication.getAuthorizedClientRegistrationId()).thenReturn("github");
                when(mockAuthentication.getPrincipal()).thenReturn(mockOAuth2User);
                when(mockOAuth2User.getName()).thenReturn("github123");

                Target updatedTarget = new Target();
                updatedTarget.setId(1L);
                updatedTarget.setPrediction(testPrediction);
                updatedTarget.setOrder(1);
                updatedTarget.setValue(testValue);
                updatedTarget.setRealValue(testRealValue);
                updatedTarget.setCreatedAt(OffsetDateTime.of(2024, 1, 15, 10, 30, 0, 0, ZoneOffset.UTC));
                updatedTarget.setUpdatedAt(OffsetDateTime.of(2024, 1, 15, 12, 0, 0, 0, ZoneOffset.UTC));

                when(targetService.updateTarget(
                                eq(OAuthProvider.GITHUB), eq("github123"), eq(1L), eq(testRealValue)))
                                .thenReturn(updatedTarget);

                // When
                ResponseEntity<TargetDto> response = targetController.updateTarget(mockAuthentication,
                                testUpdateParams);

                // Then
                assertEquals(HttpStatus.CREATED, response.getStatusCode());
                assertNotNull(response.getBody());

                TargetDto targetDto = response.getBody();
                assertNotNull(targetDto);
                assertEquals(1L, targetDto.getId());
                assertEquals(testRealValue, targetDto.getRealValue());

                verify(targetService).updateTarget(
                                eq(OAuthProvider.GITHUB), eq("github123"), eq(1L), eq(testRealValue));
        }

        @Test
        void updateTarget_Success_GoogleProvider() {
                // Given
                when(mockAuthentication.getAuthorizedClientRegistrationId()).thenReturn("google");
                when(mockAuthentication.getPrincipal()).thenReturn(mockOAuth2User);
                when(mockOAuth2User.getName()).thenReturn("google456");

                Target updatedTarget = new Target();
                updatedTarget.setId(1L);
                updatedTarget.setPrediction(testPrediction);
                updatedTarget.setOrder(1);
                updatedTarget.setValue(testValue);
                updatedTarget.setRealValue(testRealValue);

                when(targetService.updateTarget(
                                eq(OAuthProvider.GOOGLE), eq("google456"), eq(1L), eq(testRealValue)))
                                .thenReturn(updatedTarget);

                // When
                ResponseEntity<TargetDto> response = targetController.updateTarget(mockAuthentication,
                                testUpdateParams);

                // Then
                assertEquals(HttpStatus.CREATED, response.getStatusCode());
                assertNotNull(response.getBody());

                verify(targetService).updateTarget(
                                eq(OAuthProvider.GOOGLE), eq("google456"), eq(1L), eq(testRealValue));
        }

        @Test
        void updateTarget_TargetDoesNotExistsException() {
                // Given
                when(mockAuthentication.getAuthorizedClientRegistrationId()).thenReturn("github");
                when(mockAuthentication.getPrincipal()).thenReturn(mockOAuth2User);
                when(mockOAuth2User.getName()).thenReturn("github123");

                TargetDoesNotExistsException exception = new TargetDoesNotExistsException(999L, "github123");
                when(targetService.updateTarget(
                                eq(OAuthProvider.GITHUB), eq("github123"), eq(1L), eq(testRealValue)))
                                .thenThrow(exception);

                // When & Then
                TargetDoesNotExistsException thrownException = assertThrows(TargetDoesNotExistsException.class,
                                () -> targetController.updateTarget(mockAuthentication, testUpdateParams));

                assertTrue(thrownException.getMessage()
                                .contains("Target with ID '999' does not exist for user: github123"));

                verify(targetService).updateTarget(
                                eq(OAuthProvider.GITHUB), eq("github123"), eq(1L), eq(testRealValue));
        }

        @Test
        void updateTarget_Success_DifferentRealValues() throws Exception {
                // Given
                when(mockAuthentication.getAuthorizedClientRegistrationId()).thenReturn("github");
                when(mockAuthentication.getPrincipal()).thenReturn(mockOAuth2User);
                when(mockOAuth2User.getName()).thenReturn("github123");

                // Test different real value JSON structures
                JsonNode numericReal = objectMapper.readTree("87.3");
                JsonNode objectReal = objectMapper.readTree("{\"actual\": 90.1, \"category\": \"excellent\"}");
                JsonNode arrayReal = objectMapper.readTree("[\"A\", \"B\", \"C\"]");

                JsonNode[] realValues = { numericReal, objectReal, arrayReal };

                for (JsonNode realValue : realValues) {
                        testUpdateParams.setRealValue(realValue);

                        Target updatedTarget = new Target();
                        updatedTarget.setId(1L);
                        updatedTarget.setPrediction(testPrediction);
                        updatedTarget.setOrder(1);
                        updatedTarget.setValue(testValue);
                        updatedTarget.setRealValue(realValue);

                        when(targetService.updateTarget(
                                        eq(OAuthProvider.GITHUB), eq("github123"), eq(1L), eq(realValue)))
                                        .thenReturn(updatedTarget);

                        // When
                        ResponseEntity<TargetDto> response = targetController.updateTarget(mockAuthentication,
                                        testUpdateParams);

                        // Then
                        assertEquals(HttpStatus.CREATED, response.getStatusCode());
                        assertNotNull(response.getBody());

                        TargetDto targetDto = response.getBody();
                        assertNotNull(targetDto);
                        assertEquals(realValue, targetDto.getRealValue());

                        verify(targetService).updateTarget(
                                        eq(OAuthProvider.GITHUB), eq("github123"), eq(1L), eq(realValue));
                }
        }

        // Tests for getAllTargets method

        @Test
        void getAllTargets_Success() throws Exception {
                // Given
                when(mockAuthentication.getAuthorizedClientRegistrationId()).thenReturn("github");
                when(mockAuthentication.getPrincipal()).thenReturn(mockOAuth2User);
                when(mockOAuth2User.getName()).thenReturn("github123");

                Target target2 = new Target();
                target2.setId(2L);
                target2.setPrediction(testPrediction);
                target2.setOrder(2);
                target2.setValue(objectMapper.readTree("{\"predicted\": 75.3, \"class\": \"negative\"}"));
                target2.setRealValue(objectMapper.readTree("{\"actual\": 78.1, \"class\": \"negative\"}"));
                target2.setCreatedAt(OffsetDateTime.of(2024, 2, 15, 10, 30, 0, 0, ZoneOffset.UTC));
                target2.setUpdatedAt(OffsetDateTime.of(2024, 2, 15, 12, 0, 0, 0, ZoneOffset.UTC));

                List<Target> targets = Arrays.asList(testTarget, target2);
                when(targetService.getTargetsByPredictionId(eq(OAuthProvider.GITHUB), eq("github123"), eq(1L)))
                                .thenReturn(targets);

                // When
                ResponseEntity<List<TargetDto>> response = targetController.getAllTargets(mockAuthentication, 1L);

                // Then
                assertEquals(HttpStatus.OK, response.getStatusCode());
                assertNotNull(response.getBody());

                List<TargetDto> targetDtos = response.getBody();
                assertNotNull(targetDtos);
                assertEquals(2, targetDtos.size());

                TargetDto firstDto = targetDtos.get(0);
                assertEquals(1L, firstDto.getId());
                assertEquals(1, firstDto.getOrder());
                assertEquals(testValue, firstDto.getValue());
                assertNull(firstDto.getRealValue());

                TargetDto secondDto = targetDtos.get(1);
                assertEquals(2L, secondDto.getId());
                assertEquals(2, secondDto.getOrder());

                verify(targetService).getTargetsByPredictionId(eq(OAuthProvider.GITHUB), eq("github123"), eq(1L));
        }

        @Test
        void getAllTargets_Success_EmptyList() {
                // Given
                when(mockAuthentication.getAuthorizedClientRegistrationId()).thenReturn("github");
                when(mockAuthentication.getPrincipal()).thenReturn(mockOAuth2User);
                when(mockOAuth2User.getName()).thenReturn("github123");

                when(targetService.getTargetsByPredictionId(eq(OAuthProvider.GITHUB), eq("github123"), eq(999L)))
                                .thenReturn(Arrays.asList());

                // When
                ResponseEntity<List<TargetDto>> response = targetController.getAllTargets(mockAuthentication, 999L);

                // Then
                assertEquals(HttpStatus.OK, response.getStatusCode());
                assertNotNull(response.getBody());

                List<TargetDto> targetDtos = response.getBody();
                assertNotNull(targetDtos);
                assertTrue(targetDtos.isEmpty());

                verify(targetService).getTargetsByPredictionId(eq(OAuthProvider.GITHUB), eq("github123"), eq(999L));
        }

        @Test
        void getAllTargets_Success_SystemProvider() {
                // Given
                when(mockAuthentication.getAuthorizedClientRegistrationId()).thenReturn("system");
                when(mockAuthentication.getPrincipal()).thenReturn(mockOAuth2User);
                when(mockOAuth2User.getName()).thenReturn("system789");

                List<Target> targets = Arrays.asList(testTarget);
                when(targetService.getTargetsByPredictionId(eq(OAuthProvider.SYSTEM), eq("system789"), eq(1L)))
                                .thenReturn(targets);

                // When
                ResponseEntity<List<TargetDto>> response = targetController.getAllTargets(mockAuthentication, 1L);

                // Then
                assertEquals(HttpStatus.OK, response.getStatusCode());
                assertNotNull(response.getBody());

                List<TargetDto> targetDtos = response.getBody();
                assertNotNull(targetDtos);
                assertEquals(1, targetDtos.size());

                verify(targetService).getTargetsByPredictionId(eq(OAuthProvider.SYSTEM), eq("system789"), eq(1L));
        }

        @Test
        void getAllTargets_DifferentPredictionIds() {
                // Given
                when(mockAuthentication.getAuthorizedClientRegistrationId()).thenReturn("github");
                when(mockAuthentication.getPrincipal()).thenReturn(mockOAuth2User);
                when(mockOAuth2User.getName()).thenReturn("github123");

                Long[] predictionIds = { 1L, 5L, 100L };

                for (Long predictionId : predictionIds) {
                        when(targetService.getTargetsByPredictionId(eq(OAuthProvider.GITHUB), eq("github123"),
                                        eq(predictionId)))
                                        .thenReturn(Arrays.asList(testTarget));

                        // When
                        ResponseEntity<List<TargetDto>> response = targetController.getAllTargets(mockAuthentication,
                                        predictionId);

                        // Then
                        assertEquals(HttpStatus.OK, response.getStatusCode());
                        assertNotNull(response.getBody());

                        List<TargetDto> targetDtos = response.getBody();
                        assertNotNull(targetDtos);
                        assertEquals(1, targetDtos.size());

                        verify(targetService).getTargetsByPredictionId(eq(OAuthProvider.GITHUB), eq("github123"),
                                        eq(predictionId));
                }
        }

        // Tests for exception handlers

        @Test
        void handleTargetDoesNotExistsException_ReturnsNotFound() {
                // Given
                TargetDoesNotExistsException exception = new TargetDoesNotExistsException(999L, "github123");
                when(mockRequest.getRequestURI()).thenReturn("/api/target/update");

                // When
                ResponseEntity<ErrorDto> response = targetController.handlePredictionDoesNotExistsException(exception,
                                mockRequest);

                // Then
                assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
                assertNotNull(response.getBody());

                ErrorDto errorDto = response.getBody();
                assertNotNull(errorDto);
                assertEquals(404, errorDto.status());
                assertEquals("Target with ID '999' does not exist for user: github123", errorDto.message());
                assertEquals("/api/target/update", errorDto.path());
                assertNotNull(errorDto.timestamp());
        }

        // Additional comprehensive tests

        @Test
        void createTarget_Success_OrderedSequence() throws Exception {
                // Given
                when(mockAuthentication.getAuthorizedClientRegistrationId()).thenReturn("github");
                when(mockAuthentication.getPrincipal()).thenReturn(mockOAuth2User);
                when(mockOAuth2User.getName()).thenReturn("github123");

                // Test creating targets in sequence with different orders
                for (int i = 0; i < 5; i++) {
                        JsonNode sequenceValue = objectMapper
                                        .readTree("{\"sequence\": " + i + ", \"value\": " + (i * 10.5) + "}");

                        testCreateParams.setOrder(i);
                        testCreateParams.setValue(sequenceValue);

                        testTarget.setOrder(i);
                        testTarget.setValue(sequenceValue);

                        when(targetService.createTarget(
                                        eq(OAuthProvider.GITHUB), eq("github123"), eq(1L), eq(i), eq(sequenceValue)))
                                        .thenReturn(testTarget);

                        // When
                        ResponseEntity<TargetDto> response = targetController.createTarget(mockAuthentication,
                                        testCreateParams);

                        // Then
                        assertEquals(HttpStatus.CREATED, response.getStatusCode());
                        assertNotNull(response.getBody());

                        TargetDto targetDto = response.getBody();
                        assertNotNull(targetDto);
                        assertEquals(i, targetDto.getOrder());
                        assertEquals(sequenceValue, targetDto.getValue());

                        verify(targetService).createTarget(
                                        eq(OAuthProvider.GITHUB), eq("github123"), eq(1L), eq(i), eq(sequenceValue));
                }
        }

        @Test
        void updateTarget_Success_NullRealValue() {
                // Given
                when(mockAuthentication.getAuthorizedClientRegistrationId()).thenReturn("github");
                when(mockAuthentication.getPrincipal()).thenReturn(mockOAuth2User);
                when(mockOAuth2User.getName()).thenReturn("github123");

                testUpdateParams.setRealValue(null);

                Target updatedTarget = new Target();
                updatedTarget.setId(1L);
                updatedTarget.setPrediction(testPrediction);
                updatedTarget.setOrder(1);
                updatedTarget.setValue(testValue);
                updatedTarget.setRealValue(null);

                when(targetService.updateTarget(
                                eq(OAuthProvider.GITHUB), eq("github123"), eq(1L), isNull()))
                                .thenReturn(updatedTarget);

                // When
                ResponseEntity<TargetDto> response = targetController.updateTarget(mockAuthentication,
                                testUpdateParams);

                // Then
                assertEquals(HttpStatus.CREATED, response.getStatusCode());
                assertNotNull(response.getBody());

                TargetDto targetDto = response.getBody();
                assertNotNull(targetDto);
                assertNull(targetDto.getRealValue());

                verify(targetService).updateTarget(
                                eq(OAuthProvider.GITHUB), eq("github123"), eq(1L), isNull());
        }
}
