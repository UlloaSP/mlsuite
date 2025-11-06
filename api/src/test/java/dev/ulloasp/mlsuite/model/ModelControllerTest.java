/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.model;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
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
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;

import dev.ulloasp.mlsuite.model.controllers.ModelControllerImpl;
import dev.ulloasp.mlsuite.model.dtos.CreateModelDto;
import dev.ulloasp.mlsuite.model.dtos.ModelDto;
import dev.ulloasp.mlsuite.model.entities.Model;
import dev.ulloasp.mlsuite.model.exceptions.AnalyzerServiceException;
import dev.ulloasp.mlsuite.model.exceptions.ModelAlreadyExistsException;
import dev.ulloasp.mlsuite.model.exceptions.ModelDoesNotExistsException;
import dev.ulloasp.mlsuite.model.exceptions.ModelNotFromUserException;
import dev.ulloasp.mlsuite.model.services.AnalyzerService;
import dev.ulloasp.mlsuite.model.services.ModelService;
import dev.ulloasp.mlsuite.signature.entities.Signature;
import dev.ulloasp.mlsuite.signature.services.SignatureService;
import dev.ulloasp.mlsuite.user.entity.OAuthProvider;
import dev.ulloasp.mlsuite.user.entity.User;
import dev.ulloasp.mlsuite.util.ErrorDto;
import jakarta.servlet.http.HttpServletRequest;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ModelControllerTest {

        @Mock
        private ModelService modelService;

        @Mock
        private SignatureService signatureService;

        @Mock
        private AnalyzerService analyzerService;

        @Mock
        private OAuth2AuthenticationToken mockAuthentication;

        @Mock
        private OAuth2User mockOAuth2User;

        @Mock
        private HttpServletRequest mockRequest;

        @InjectMocks
        private ModelControllerImpl modelController;

        private Model testModel;
        private User testUser;
        private Signature testModelSignature;
        private Signature testDataframeSignature;
        private MockMultipartFile testModelFile;
        private MockMultipartFile testDataframeFile;
        private Map<String, Object> testSchemaFromModel;
        private Map<String, Object> testSchemaFromDataframe;

        @BeforeEach
        void setUp() {
                // Setup test user
                testUser = new User();
                testUser.setId(1L);
                testUser.setOauthId("github123");
                testUser.setOauthProvider(OAuthProvider.GITHUB);

                // Setup test model
                byte[] modelFileContent = "mock model file content".getBytes();
                testModel = new Model();
                testModel.setId(1L);
                testModel.setUser(testUser);
                testModel.setName("Test Model");
                testModel.setType("sklearn");
                testModel.setSpecificType("RandomForestClassifier");
                testModel.setFileName("test_model.pkl");
                testModel.setModelFile(modelFileContent);
                testModel.setCreatedAt(OffsetDateTime.of(2024, 1, 15, 10, 30, 0, 0, ZoneOffset.UTC));

                // Setup test schemas
                testSchemaFromModel = new HashMap<>();
                testSchemaFromModel.put("feature1", "float64");
                testSchemaFromModel.put("feature2", "int64");
                testSchemaFromModel.put("feature3", "object");

                testSchemaFromDataframe = new HashMap<>();
                testSchemaFromDataframe.put("feature1", "float64");
                testSchemaFromDataframe.put("feature2", "int64");
                testSchemaFromDataframe.put("feature3", "object");
                testSchemaFromDataframe.put("feature4", "bool");

                // Setup test signatures
                testModelSignature = new Signature();
                testModelSignature.setId(1L);
                testModelSignature.setModel(testModel);
                testModelSignature.setName("Model");
                testModelSignature.setMajor(0);
                testModelSignature.setMinor(0);
                testModelSignature.setPatch(0);
                testModelSignature.setInputSignature(testSchemaFromModel);
                testModelSignature.setOrigin(null);
                testModelSignature.setCreatedAt(OffsetDateTime.of(2024, 1, 15, 10, 30, 0, 0, ZoneOffset.UTC));

                testDataframeSignature = new Signature();
                testDataframeSignature.setId(2L);
                testDataframeSignature.setModel(testModel);
                testDataframeSignature.setName("Dataframe");
                testDataframeSignature.setMajor(0);
                testDataframeSignature.setMinor(0);
                testDataframeSignature.setPatch(1);
                testDataframeSignature.setInputSignature(testSchemaFromDataframe);
                testDataframeSignature.setOrigin(testModelSignature);
                testDataframeSignature.setCreatedAt(OffsetDateTime.of(2024, 1, 15, 10, 35, 0, 0, ZoneOffset.UTC));

                // Setup test multipart files
                testModelFile = new MockMultipartFile("modelFile", "test_model.pkl", "application/octet-stream",
                                modelFileContent);
                testDataframeFile = new MockMultipartFile("dataframeFile", "test_dataframe.csv", "text/csv",
                                "feature1,feature2,feature3,feature4\n1.0,1,test,true".getBytes());

                // Setup mock request
                when(mockRequest.getRequestURI()).thenReturn("/api/model");
        }

        // Tests for createModel method

        @Test
        void createModel_Success_WithoutDataframe_GitHubProvider() {
                // Given
                when(mockAuthentication.getAuthorizedClientRegistrationId()).thenReturn("github");
                when(mockAuthentication.getPrincipal()).thenReturn(mockOAuth2User);
                when(mockOAuth2User.getName()).thenReturn("github123");

                when(modelService.createModel(eq(OAuthProvider.GITHUB), eq("github123"), eq("Test Model"),
                                eq(testModelFile)))
                                .thenReturn(testModel);

                when(analyzerService.generateInputSignature(eq(OAuthProvider.GITHUB), eq("github123"),
                                eq(testModelFile),
                                isNull()))
                                .thenReturn(testSchemaFromModel);

                when(signatureService.createSignature(
                                eq(OAuthProvider.GITHUB), eq("github123"), eq(1L), eq(testSchemaFromModel),
                                eq("Model"), eq(0), eq(0), eq(0), isNull()))
                                .thenReturn(testModelSignature);

                // When
                ResponseEntity<CreateModelDto> response = modelController.createModel(mockAuthentication, "Test Model",
                                testModelFile, null);

                // Then
                assertEquals(HttpStatus.CREATED, response.getStatusCode());
                assertNotNull(response.getBody());

                CreateModelDto createModelDto = response.getBody();
                assertNotNull(createModelDto);
                assertNotNull(createModelDto.getModel());
                assertNotNull(createModelDto.getSignatureFromModel());
                assertNull(createModelDto.getSignatureFromDataframe());

                // Verify model details
                assertEquals(1L, createModelDto.getModel().getId());
                assertEquals("Test Model", createModelDto.getModel().getName());
                assertEquals("sklearn", createModelDto.getModel().getType());
                assertEquals("RandomForestClassifier", createModelDto.getModel().getSpecificType());
                assertEquals("test_model.pkl", createModelDto.getModel().getFileName());

                // Verify signature from model
                assertEquals(1L, createModelDto.getSignatureFromModel().getId());
                assertEquals("Model", createModelDto.getSignatureFromModel().getName());
                assertEquals(0, createModelDto.getSignatureFromModel().getMajor());
                assertEquals(0, createModelDto.getSignatureFromModel().getMinor());
                assertEquals(0, createModelDto.getSignatureFromModel().getPatch());
                assertEquals(testSchemaFromModel, createModelDto.getSignatureFromModel().getInputSignature());

                verify(modelService).createModel(eq(OAuthProvider.GITHUB), eq("github123"), eq("Test Model"),
                                eq(testModelFile));
                verify(analyzerService).generateInputSignature(eq(OAuthProvider.GITHUB), eq("github123"),
                                eq(testModelFile),
                                isNull());
                verify(signatureService).createSignature(
                                eq(OAuthProvider.GITHUB), eq("github123"), eq(1L), eq(testSchemaFromModel),
                                eq("Model"), eq(0), eq(0), eq(0), isNull());
        }

        @Test
        void createModel_Success_WithDataframe_GoogleProvider() {
                // Given
                when(mockAuthentication.getAuthorizedClientRegistrationId()).thenReturn("google");
                when(mockAuthentication.getPrincipal()).thenReturn(mockOAuth2User);
                when(mockOAuth2User.getName()).thenReturn("google456");

                when(modelService.createModel(eq(OAuthProvider.GOOGLE), eq("google456"), eq("Test Model"),
                                eq(testModelFile)))
                                .thenReturn(testModel);

                when(analyzerService.generateInputSignature(eq(OAuthProvider.GOOGLE), eq("google456"),
                                eq(testModelFile),
                                isNull()))
                                .thenReturn(testSchemaFromModel);

                when(analyzerService.generateInputSignature(eq(OAuthProvider.GOOGLE), eq("google456"),
                                eq(testModelFile),
                                eq(testDataframeFile)))
                                .thenReturn(testSchemaFromDataframe);

                when(signatureService.createSignature(
                                eq(OAuthProvider.GOOGLE), eq("google456"), eq(1L), eq(testSchemaFromModel),
                                eq("Model"), eq(0), eq(0), eq(0), isNull()))
                                .thenReturn(testModelSignature);

                when(signatureService.createSignature(
                                eq(OAuthProvider.GOOGLE), eq("google456"), eq(1L), eq(testSchemaFromDataframe),
                                eq("Dataframe"), eq(0), eq(0), eq(1), eq(1L)))
                                .thenReturn(testDataframeSignature);

                // When
                ResponseEntity<CreateModelDto> response = modelController.createModel(mockAuthentication, "Test Model",
                                testModelFile, testDataframeFile);

                // Then
                assertEquals(HttpStatus.CREATED, response.getStatusCode());
                assertNotNull(response.getBody());

                CreateModelDto createModelDto = response.getBody();
                assertNotNull(createModelDto);
                assertNotNull(createModelDto.getModel());
                assertNotNull(createModelDto.getSignatureFromModel());
                assertNotNull(createModelDto.getSignatureFromDataframe());

                // Verify signature from dataframe
                assertEquals(2L, createModelDto.getSignatureFromDataframe().getId());
                assertEquals("Dataframe", createModelDto.getSignatureFromDataframe().getName());
                assertEquals(0, createModelDto.getSignatureFromDataframe().getMajor());
                assertEquals(0, createModelDto.getSignatureFromDataframe().getMinor());
                assertEquals(1, createModelDto.getSignatureFromDataframe().getPatch());
                assertEquals(testSchemaFromDataframe, createModelDto.getSignatureFromDataframe().getInputSignature());
                assertEquals(1L, createModelDto.getSignatureFromDataframe().getOrigin());

                verify(modelService).createModel(eq(OAuthProvider.GOOGLE), eq("google456"), eq("Test Model"),
                                eq(testModelFile));
                verify(analyzerService).generateInputSignature(eq(OAuthProvider.GOOGLE), eq("google456"),
                                eq(testModelFile),
                                isNull());
                verify(analyzerService).generateInputSignature(eq(OAuthProvider.GOOGLE), eq("google456"),
                                eq(testModelFile),
                                eq(testDataframeFile));
                verify(signatureService).createSignature(
                                eq(OAuthProvider.GOOGLE), eq("google456"), eq(1L), eq(testSchemaFromModel),
                                eq("Model"), eq(0), eq(0), eq(0), isNull());
                verify(signatureService).createSignature(
                                eq(OAuthProvider.GOOGLE), eq("google456"), eq(1L), eq(testSchemaFromDataframe),
                                eq("Dataframe"), eq(0), eq(0), eq(1), eq(1L));
        }

        @Test
        void createModel_Success_SystemProvider() {
                // Given
                when(mockAuthentication.getAuthorizedClientRegistrationId()).thenReturn("system");
                when(mockAuthentication.getPrincipal()).thenReturn(mockOAuth2User);
                when(mockOAuth2User.getName()).thenReturn("system789");

                when(modelService.createModel(eq(OAuthProvider.SYSTEM), eq("system789"), eq("Test Model"),
                                eq(testModelFile)))
                                .thenReturn(testModel);

                when(analyzerService.generateInputSignature(eq(OAuthProvider.SYSTEM), eq("system789"),
                                eq(testModelFile),
                                isNull()))
                                .thenReturn(testSchemaFromModel);

                when(signatureService.createSignature(
                                eq(OAuthProvider.SYSTEM), eq("system789"), eq(1L), eq(testSchemaFromModel),
                                eq("Model"), eq(0), eq(0), eq(0), isNull()))
                                .thenReturn(testModelSignature);

                // When
                ResponseEntity<CreateModelDto> response = modelController.createModel(mockAuthentication, "Test Model",
                                testModelFile, null);

                // Then
                assertEquals(HttpStatus.CREATED, response.getStatusCode());
                assertNotNull(response.getBody());

                verify(modelService).createModel(eq(OAuthProvider.SYSTEM), eq("system789"), eq("Test Model"),
                                eq(testModelFile));
                verify(analyzerService).generateInputSignature(eq(OAuthProvider.SYSTEM), eq("system789"),
                                eq(testModelFile),
                                isNull());
                verify(signatureService).createSignature(
                                eq(OAuthProvider.SYSTEM), eq("system789"), eq(1L), eq(testSchemaFromModel),
                                eq("Model"), eq(0), eq(0), eq(0), isNull());
        }

        @Test
        void createModel_ModelAlreadyExistsException() {
                // Given
                when(mockAuthentication.getAuthorizedClientRegistrationId()).thenReturn("github");
                when(mockAuthentication.getPrincipal()).thenReturn(mockOAuth2User);
                when(mockOAuth2User.getName()).thenReturn("github123");

                ModelAlreadyExistsException exception = new ModelAlreadyExistsException("Test Model", "github123");
                when(modelService.createModel(eq(OAuthProvider.GITHUB), eq("github123"), eq("Test Model"),
                                eq(testModelFile)))
                                .thenThrow(exception);

                // When & Then
                ModelAlreadyExistsException thrownException = assertThrows(ModelAlreadyExistsException.class,
                                () -> modelController.createModel(mockAuthentication, "Test Model", testModelFile,
                                                null));

                assertTrue(thrownException.getMessage()
                                .contains("Model 'Test Model' already exists for user 'github123'."));

                verify(modelService).createModel(eq(OAuthProvider.GITHUB), eq("github123"), eq("Test Model"),
                                eq(testModelFile));
                verify(analyzerService, never()).generateInputSignature(any(OAuthProvider.class), anyString(), any(),
                                any());
                verify(signatureService, never()).createSignature(any(OAuthProvider.class), anyString(), anyLong(),
                                any(),
                                anyString(), anyInt(), anyInt(), anyInt(), any());
        }

        @Test
        void createModel_AnalyzerServiceException_NetworkError() {
                // Given
                when(mockAuthentication.getAuthorizedClientRegistrationId()).thenReturn("github");
                when(mockAuthentication.getPrincipal()).thenReturn(mockOAuth2User);
                when(mockOAuth2User.getName()).thenReturn("github123");

                when(modelService.createModel(eq(OAuthProvider.GITHUB), eq("github123"), eq("Test Model"),
                                eq(testModelFile)))
                                .thenReturn(testModel);

                AnalyzerServiceException exception = new AnalyzerServiceException(0, "/generate-schema",
                                "Analyzer service unreachable", "Connection refused", HttpHeaders.EMPTY);
                when(analyzerService.generateInputSignature(eq(OAuthProvider.GITHUB), eq("github123"),
                                eq(testModelFile),
                                isNull()))
                                .thenThrow(exception);

                // When & Then
                AnalyzerServiceException thrownException = assertThrows(AnalyzerServiceException.class,
                                () -> modelController.createModel(mockAuthentication, "Test Model", testModelFile,
                                                null));

                assertEquals(0, thrownException.getStatus());
                assertEquals("/generate-schema", thrownException.getEndpoint());
                assertTrue(thrownException.getMessage().contains("Analyzer service unreachable"));

                verify(modelService).createModel(eq(OAuthProvider.GITHUB), eq("github123"), eq("Test Model"),
                                eq(testModelFile));
                verify(analyzerService).generateInputSignature(eq(OAuthProvider.GITHUB), eq("github123"),
                                eq(testModelFile),
                                isNull());
                verify(signatureService, never()).createSignature(any(OAuthProvider.class), anyString(), anyLong(),
                                any(),
                                anyString(), anyInt(), anyInt(), anyInt(), any());
        }

        @Test
        void createModel_AnalyzerServiceException_HttpError() {
                // Given
                when(mockAuthentication.getAuthorizedClientRegistrationId()).thenReturn("github");
                when(mockAuthentication.getPrincipal()).thenReturn(mockOAuth2User);
                when(mockOAuth2User.getName()).thenReturn("github123");

                when(modelService.createModel(eq(OAuthProvider.GITHUB), eq("github123"), eq("Test Model"),
                                eq(testModelFile)))
                                .thenReturn(testModel);

                AnalyzerServiceException exception = new AnalyzerServiceException(400, "/generate-schema",
                                "Not a sklearn estimator.", "{\"detail\": \"Not a sklearn estimator.\"}",
                                HttpHeaders.EMPTY);
                when(analyzerService.generateInputSignature(eq(OAuthProvider.GITHUB), eq("github123"),
                                eq(testModelFile),
                                isNull()))
                                .thenThrow(exception);

                // When & Then
                AnalyzerServiceException thrownException = assertThrows(AnalyzerServiceException.class,
                                () -> modelController.createModel(mockAuthentication, "Test Model", testModelFile,
                                                null));

                assertEquals(400, thrownException.getStatus());
                assertEquals("/generate-schema", thrownException.getEndpoint());
                assertTrue(thrownException.getMessage().contains("Not a sklearn estimator."));

                verify(modelService).createModel(eq(OAuthProvider.GITHUB), eq("github123"), eq("Test Model"),
                                eq(testModelFile));
                verify(analyzerService).generateInputSignature(eq(OAuthProvider.GITHUB), eq("github123"),
                                eq(testModelFile),
                                isNull());
                verify(signatureService, never()).createSignature(any(OAuthProvider.class), anyString(), anyLong(),
                                any(),
                                anyString(), anyInt(), anyInt(), anyInt(), any());
        }

        // Tests for getAllModels method

        @Test
        void getAllModels_Success_GitHubProvider() {
                // Given
                when(mockAuthentication.getAuthorizedClientRegistrationId()).thenReturn("github");
                when(mockAuthentication.getPrincipal()).thenReturn(mockOAuth2User);
                when(mockOAuth2User.getName()).thenReturn("github123");

                Model model2 = new Model();
                model2.setId(2L);
                model2.setUser(testUser);
                model2.setName("Second Model");
                model2.setType("tensorflow");
                model2.setSpecificType("Sequential");
                model2.setFileName("second_model.h5");
                model2.setModelFile("second model content".getBytes());
                model2.setCreatedAt(OffsetDateTime.of(2024, 2, 15, 10, 30, 0, 0, ZoneOffset.UTC));

                List<Model> models = Arrays.asList(testModel, model2);
                when(modelService.getModels(eq(OAuthProvider.GITHUB), eq("github123")))
                                .thenReturn(models);

                // When
                ResponseEntity<List<ModelDto>> response = modelController.getAllModels(mockAuthentication);

                // Then
                assertEquals(HttpStatus.OK, response.getStatusCode());
                assertNotNull(response.getBody());

                List<ModelDto> modelDtos = response.getBody();
                assertNotNull(modelDtos);
                assertEquals(2, modelDtos.size());

                ModelDto firstDto = modelDtos.get(0);
                assertEquals(1L, firstDto.getId());
                assertEquals("Test Model", firstDto.getName());
                assertEquals("sklearn", firstDto.getType());
                assertEquals("RandomForestClassifier", firstDto.getSpecificType());
                assertEquals("test_model.pkl", firstDto.getFileName());

                ModelDto secondDto = modelDtos.get(1);
                assertEquals(2L, secondDto.getId());
                assertEquals("Second Model", secondDto.getName());
                assertEquals("tensorflow", secondDto.getType());
                assertEquals("Sequential", secondDto.getSpecificType());
                assertEquals("second_model.h5", secondDto.getFileName());

                verify(modelService).getModels(eq(OAuthProvider.GITHUB), eq("github123"));
        }

        @Test
        void getAllModels_Success_EmptyList() {
                // Given
                when(mockAuthentication.getAuthorizedClientRegistrationId()).thenReturn("github");
                when(mockAuthentication.getPrincipal()).thenReturn(mockOAuth2User);
                when(mockOAuth2User.getName()).thenReturn("github123");

                when(modelService.getModels(eq(OAuthProvider.GITHUB), eq("github123")))
                                .thenReturn(Arrays.asList());

                // When
                ResponseEntity<List<ModelDto>> response = modelController.getAllModels(mockAuthentication);

                // Then
                assertEquals(HttpStatus.OK, response.getStatusCode());
                assertNotNull(response.getBody());

                List<ModelDto> modelDtos = response.getBody();
                assertNotNull(modelDtos);
                assertTrue(modelDtos.isEmpty());

                verify(modelService).getModels(eq(OAuthProvider.GITHUB), eq("github123"));
        }

        @Test
        void getAllModels_Success_GoogleProvider() {
                // Given
                when(mockAuthentication.getAuthorizedClientRegistrationId()).thenReturn("google");
                when(mockAuthentication.getPrincipal()).thenReturn(mockOAuth2User);
                when(mockOAuth2User.getName()).thenReturn("google456");

                List<Model> models = Arrays.asList(testModel);
                when(modelService.getModels(eq(OAuthProvider.GOOGLE), eq("google456")))
                                .thenReturn(models);

                // When
                ResponseEntity<List<ModelDto>> response = modelController.getAllModels(mockAuthentication);

                // Then
                assertEquals(HttpStatus.OK, response.getStatusCode());
                assertNotNull(response.getBody());

                List<ModelDto> modelDtos = response.getBody();
                assertNotNull(modelDtos);
                assertEquals(1, modelDtos.size());

                verify(modelService).getModels(eq(OAuthProvider.GOOGLE), eq("google456"));
        }

        @Test
        void getAllModels_Success_SystemProvider() {
                // Given
                when(mockAuthentication.getAuthorizedClientRegistrationId()).thenReturn("system");
                when(mockAuthentication.getPrincipal()).thenReturn(mockOAuth2User);
                when(mockOAuth2User.getName()).thenReturn("system789");

                List<Model> models = Arrays.asList(testModel);
                when(modelService.getModels(eq(OAuthProvider.SYSTEM), eq("system789")))
                                .thenReturn(models);

                // When
                ResponseEntity<List<ModelDto>> response = modelController.getAllModels(mockAuthentication);

                // Then
                assertEquals(HttpStatus.OK, response.getStatusCode());
                assertNotNull(response.getBody());

                List<ModelDto> modelDtos = response.getBody();
                assertNotNull(modelDtos);
                assertEquals(1, modelDtos.size());

                verify(modelService).getModels(eq(OAuthProvider.SYSTEM), eq("system789"));
        }

        // Tests for exception handlers

        @Test
        void handleModelAlreadyExistsException_ReturnsConflict() {
                // Given
                ModelAlreadyExistsException exception = new ModelAlreadyExistsException("Test Model", "github123");
                when(mockRequest.getRequestURI()).thenReturn("/api/model/create");

                // When
                ResponseEntity<ErrorDto> response = modelController.handleModelAlreadyExistsException(exception,
                                mockRequest);

                // Then
                assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
                assertNotNull(response.getBody());

                ErrorDto errorDto = response.getBody();
                assertNotNull(errorDto);
                assertEquals(409, errorDto.status());
                assertTrue(errorDto.message().contains("Model 'Test Model' already exists for user 'github123'."));
                assertEquals("/api/model/create", errorDto.path());
                assertNotNull(errorDto.timestamp());
        }

        @Test
        void handleModelDoesNotExistsException_ReturnsNotFound() {
                // Given
                ModelDoesNotExistsException exception = new ModelDoesNotExistsException(999L, "github123");
                when(mockRequest.getRequestURI()).thenReturn("/api/model/999");

                // When
                ResponseEntity<ErrorDto> response = modelController.handleModelDoesNotExistsException(exception,
                                mockRequest);

                // Then
                assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
                assertNotNull(response.getBody());

                ErrorDto errorDto = response.getBody();
                assertNotNull(errorDto);
                assertEquals(404, errorDto.status());
                assertTrue(errorDto.message().contains("Model with ID '999' does not exist for user 'github123'."));
                assertEquals("/api/model/999", errorDto.path());
                assertNotNull(errorDto.timestamp());
        }

        @Test
        void handleModelNotFromUserException_ReturnsForbidden() {
                // Given
                ModelNotFromUserException exception = new ModelNotFromUserException(1L, "Test Model", "github123");
                when(mockRequest.getRequestURI()).thenReturn("/api/model/1");

                // When
                ResponseEntity<ErrorDto> response = modelController.handleModelNotFromUserException(exception,
                                mockRequest);

                // Then
                assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
                assertNotNull(response.getBody());

                ErrorDto errorDto = response.getBody();
                assertNotNull(errorDto);
                assertEquals(403, errorDto.status());
                assertTrue(errorDto.message()
                                .contains("Model with ID '1' and name 'Test Model' does not belong to user 'github123'."));
                assertEquals("/api/model/1", errorDto.path());
                assertNotNull(errorDto.timestamp());
        }

        @Test
        void handleAnalyzerServiceException_NetworkError_ReturnsBadGateway() {
                // Given
                AnalyzerServiceException exception = new AnalyzerServiceException(0, "/generate-schema",
                                "Analyzer service unreachable", "Connection refused", HttpHeaders.EMPTY);
                when(mockRequest.getRequestURI()).thenReturn("/api/model/create");

                // When
                ResponseEntity<ErrorDto> response = modelController.handleAnalyzer(exception, mockRequest);

                // Then
                assertEquals(HttpStatus.BAD_GATEWAY, response.getStatusCode());
                assertNotNull(response.getBody());

                ErrorDto errorDto = response.getBody();
                assertNotNull(errorDto);
                assertEquals(502, errorDto.status());
                assertTrue(errorDto.message().contains("Analyzer service unreachable"));
                assertEquals("/api/model/create", errorDto.path());
                assertNotNull(errorDto.timestamp());
        }

        @Test
        void handleAnalyzerServiceException_HttpError_ReturnsOriginalStatus() {
                // Given
                AnalyzerServiceException exception = new AnalyzerServiceException(400, "/generate-schema",
                                "Not a sklearn estimator.", "{\"detail\": \"Not a sklearn estimator.\"}",
                                HttpHeaders.EMPTY);
                when(mockRequest.getRequestURI()).thenReturn("/api/model/create");

                // When
                ResponseEntity<ErrorDto> response = modelController.handleAnalyzer(exception, mockRequest);

                // Then
                assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
                assertNotNull(response.getBody());

                ErrorDto errorDto = response.getBody();
                assertNotNull(errorDto);
                assertEquals(400, errorDto.status());
                assertTrue(errorDto.message().contains("Not a sklearn estimator."));
                assertEquals("/api/model/create", errorDto.path());
                assertNotNull(errorDto.timestamp());
        }

        @Test
        void handleAnalyzerServiceException_BlankDetail_ReturnsDefaultMessage() {
                // Given
                AnalyzerServiceException exception = new AnalyzerServiceException(500, "/generate-schema",
                                "", "Internal Server Error", HttpHeaders.EMPTY);
                when(mockRequest.getRequestURI()).thenReturn("/api/model/create");

                // When
                ResponseEntity<ErrorDto> response = modelController.handleAnalyzer(exception, mockRequest);

                // Then
                assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
                assertNotNull(response.getBody());

                ErrorDto errorDto = response.getBody();
                assertNotNull(errorDto);
                assertEquals(500, errorDto.status());
                assertEquals("Analyzer Error", errorDto.message());
                assertEquals("/api/model/create", errorDto.path());
                assertNotNull(errorDto.timestamp());
        }

        // Additional comprehensive tests

        @Test
        void createModel_DifferentModelTypes() {
                // Given
                when(mockAuthentication.getAuthorizedClientRegistrationId()).thenReturn("github");
                when(mockAuthentication.getPrincipal()).thenReturn(mockOAuth2User);
                when(mockOAuth2User.getName()).thenReturn("github123");

                String[] modelNames = { "TensorFlow Model", "PyTorch Model", "XGBoost Model" };
                String[] types = { "tensorflow", "pytorch", "xgboost" };
                String[] specificTypes = { "Sequential", "Module", "XGBClassifier" };
                String[] fileNames = { "tf_model.h5", "pytorch_model.pth", "xgb_model.pkl" };

                for (int i = 0; i < modelNames.length; i++) {
                        Model model = new Model();
                        model.setId((long) (i + 1));
                        model.setUser(testUser);
                        model.setName(modelNames[i]);
                        model.setType(types[i]);
                        model.setSpecificType(specificTypes[i]);
                        model.setFileName(fileNames[i]);
                        model.setModelFile(("model content " + i).getBytes());

                        when(modelService.createModel(eq(OAuthProvider.GITHUB), eq("github123"), eq(modelNames[i]),
                                        any()))
                                        .thenReturn(model);

                        when(analyzerService.generateInputSignature(eq(OAuthProvider.GITHUB), eq("github123"), any(),
                                        isNull()))
                                        .thenReturn(testSchemaFromModel);

                        when(signatureService.createSignature(
                                        eq(OAuthProvider.GITHUB), eq("github123"), eq((long) (i + 1)),
                                        eq(testSchemaFromModel),
                                        eq("Model"), eq(0), eq(0), eq(0), isNull()))
                                        .thenReturn(testModelSignature);

                        // When
                        ResponseEntity<CreateModelDto> response = modelController.createModel(mockAuthentication,
                                        modelNames[i],
                                        testModelFile, null);

                        // Then
                        assertEquals(HttpStatus.CREATED, response.getStatusCode());
                        assertNotNull(response.getBody());

                        CreateModelDto createModelDto = response.getBody();
                        assertNotNull(createModelDto);
                        assertEquals(modelNames[i], createModelDto.getModel().getName());
                        assertEquals(types[i], createModelDto.getModel().getType());
                        assertEquals(specificTypes[i], createModelDto.getModel().getSpecificType());
                        assertEquals(fileNames[i], createModelDto.getModel().getFileName());

                        verify(modelService).createModel(eq(OAuthProvider.GITHUB), eq("github123"), eq(modelNames[i]),
                                        any());
                }
        }
}
