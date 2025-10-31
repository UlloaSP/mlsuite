package dev.ulloasp.mlsuite.model;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.HashMap;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.multipart.MultipartFile;

import dev.ulloasp.mlsuite.model.controllers.AnalyzerControllerImpl;
import dev.ulloasp.mlsuite.model.exceptions.AnalyzerServiceException;
import dev.ulloasp.mlsuite.model.services.AnalyzerService;
import dev.ulloasp.mlsuite.user.entity.OAuthProvider;

@ExtendWith(MockitoExtension.class)
class AnalyzerControllerTest {

        @Mock
        private AnalyzerService analyzerService;

        @Mock
        private OAuth2AuthenticationToken mockAuthentication;

        @Mock
        private OAuth2User mockOAuth2User;

        @Mock
        private MultipartFile mockModelFile;

        @Mock
        private MultipartFile mockDataframe;

        @InjectMocks
        private AnalyzerControllerImpl analyzerController;

        private Map<String, Object> testInputSignature;
        private Map<String, Object> testPredictionData;
        private Map<String, Object> testPredictionResult;

        @BeforeEach
        void setUp() {
                testInputSignature = new HashMap<>();
                testInputSignature.put("feature1", "float64");
                testInputSignature.put("feature2", "int64");
                testInputSignature.put("feature3", "object");

                testPredictionData = new HashMap<>();
                testPredictionData.put("feature1", 1.5);
                testPredictionData.put("feature2", 10);
                testPredictionData.put("feature3", "category_a");

                testPredictionResult = new HashMap<>();
                testPredictionResult.put("prediction", "positive");
                testPredictionResult.put("probability", 0.85);
                testPredictionResult.put("confidence", 0.92);

                // Setup mock authentication
                when(mockAuthentication.getAuthorizedClientRegistrationId()).thenReturn("github");
                when(mockAuthentication.getPrincipal()).thenReturn(mockOAuth2User);
                when(mockOAuth2User.getName()).thenReturn("github123");
        }

        // Tests for generateSchema method

        @Test
        void generateSchema_Success_WithModelAndDataframe() {
                // Given
                when(analyzerService.generateInputSignature(eq(OAuthProvider.GITHUB), eq("github123"),
                                eq(mockModelFile), eq(mockDataframe)))
                                .thenReturn(testInputSignature);

                // When
                ResponseEntity<Map<String, Object>> response = analyzerController.generateSchema(
                                mockAuthentication, mockModelFile, mockDataframe);

                // Then
                assertEquals(HttpStatus.OK, response.getStatusCode());
                assertNotNull(response.getBody());
                assertEquals(testInputSignature, response.getBody());

                verify(analyzerService).generateInputSignature(eq(OAuthProvider.GITHUB), eq("github123"),
                                eq(mockModelFile), eq(mockDataframe));
        }

        @Test
        void generateSchema_Success_WithModelOnly() {
                // Given
                when(analyzerService.generateInputSignature(eq(OAuthProvider.GITHUB), eq("github123"),
                                eq(mockModelFile), isNull()))
                                .thenReturn(testInputSignature);

                // When
                ResponseEntity<Map<String, Object>> response = analyzerController.generateSchema(
                                mockAuthentication, mockModelFile, null);

                // Then
                assertEquals(HttpStatus.OK, response.getStatusCode());
                assertNotNull(response.getBody());
                assertEquals(testInputSignature, response.getBody());

                verify(analyzerService).generateInputSignature(eq(OAuthProvider.GITHUB), eq("github123"),
                                eq(mockModelFile), isNull());
        }

        @Test
        void generateSchema_AnalyzerServiceException_PropagatesException() {
                // Given
                AnalyzerServiceException analyzerException = new AnalyzerServiceException(
                                400, "https://localhost:8000/build_schema", "Not a sklearn estimator.",
                                "{\"detail\": \"Not a sklearn estimator.\"}", null);

                when(analyzerService.generateInputSignature(eq(OAuthProvider.GITHUB), eq("github123"),
                                eq(mockModelFile), isNull()))
                                .thenThrow(analyzerException);

                // When & Then
                AnalyzerServiceException exception = assertThrows(AnalyzerServiceException.class,
                                () -> analyzerController.generateSchema(mockAuthentication, mockModelFile, null));

                assertEquals(400, exception.getStatus());
                assertEquals("https://localhost:8000/build_schema", exception.getEndpoint());
                assertEquals("Not a sklearn estimator.", exception.getDetail());

                verify(analyzerService).generateInputSignature(eq(OAuthProvider.GITHUB), eq("github123"),
                                eq(mockModelFile), isNull());
        }

        @Test
        void generateSchema_AnalyzerServiceException_NetworkError() {
                // Given
                AnalyzerServiceException analyzerException = new AnalyzerServiceException(
                                0, "https://localhost:8000/build_schema", "Analyzer service unreachable",
                                "Connection refused", null);

                when(analyzerService.generateInputSignature(eq(OAuthProvider.GITHUB), eq("github123"),
                                eq(mockModelFile), isNull()))
                                .thenThrow(analyzerException);

                // When & Then
                AnalyzerServiceException exception = assertThrows(AnalyzerServiceException.class,
                                () -> analyzerController.generateSchema(mockAuthentication, mockModelFile, null));

                assertEquals(0, exception.getStatus());
                assertEquals("https://localhost:8000/build_schema", exception.getEndpoint());
                assertEquals("Analyzer service unreachable", exception.getDetail());

                verify(analyzerService).generateInputSignature(eq(OAuthProvider.GITHUB), eq("github123"),
                                eq(mockModelFile), isNull());
        }

        @Test
        void generateSchema_GoogleOAuthProvider() {
                // Given
                when(mockAuthentication.getAuthorizedClientRegistrationId()).thenReturn("google");
                when(analyzerService.generateInputSignature(eq(OAuthProvider.GOOGLE), eq("github123"),
                                eq(mockModelFile), isNull()))
                                .thenReturn(testInputSignature);

                // When
                ResponseEntity<Map<String, Object>> response = analyzerController.generateSchema(
                                mockAuthentication, mockModelFile, null);

                // Then
                assertEquals(HttpStatus.OK, response.getStatusCode());
                assertEquals(testInputSignature, response.getBody());

                verify(analyzerService).generateInputSignature(eq(OAuthProvider.GOOGLE), eq("github123"),
                                eq(mockModelFile), isNull());
        }

        @Test
        void generateSchema_SystemOAuthProvider() {
                // Given
                when(mockAuthentication.getAuthorizedClientRegistrationId()).thenReturn("system");
                when(analyzerService.generateInputSignature(eq(OAuthProvider.SYSTEM), eq("github123"),
                                eq(mockModelFile), isNull()))
                                .thenReturn(testInputSignature);

                // When
                ResponseEntity<Map<String, Object>> response = analyzerController.generateSchema(
                                mockAuthentication, mockModelFile, null);

                // Then
                assertEquals(HttpStatus.OK, response.getStatusCode());
                assertEquals(testInputSignature, response.getBody());

                verify(analyzerService).generateInputSignature(eq(OAuthProvider.SYSTEM), eq("github123"),
                                eq(mockModelFile), isNull());
        }

        // Tests for predict method

        @Test
        void predict_Success() {
                // Given
                when(analyzerService.predict(eq(OAuthProvider.GITHUB), eq("github123"), eq(1L), eq(testPredictionData)))
                                .thenReturn(testPredictionResult);

                // When
                ResponseEntity<Map<String, Object>> response = analyzerController.predict(
                                mockAuthentication, 1L, testPredictionData);

                // Then
                assertEquals(HttpStatus.OK, response.getStatusCode());
                assertNotNull(response.getBody());
                assertEquals(testPredictionResult, response.getBody());

                verify(analyzerService).predict(eq(OAuthProvider.GITHUB), eq("github123"), eq(1L),
                                eq(testPredictionData));
        }

        @Test
        void predict_AnalyzerServiceException_UnprocessableEntity() {
                // Given
                AnalyzerServiceException analyzerException = new AnalyzerServiceException(
                                422, "https://localhost:8000/predict", "Invalid input data format.",
                                "{\"detail\": \"Invalid input data format.\"}", null);

                when(analyzerService.predict(eq(OAuthProvider.GITHUB), eq("github123"), eq(1L), eq(testPredictionData)))
                                .thenThrow(analyzerException);

                // When & Then
                AnalyzerServiceException exception = assertThrows(AnalyzerServiceException.class,
                                () -> analyzerController.predict(mockAuthentication, 1L, testPredictionData));

                assertEquals(422, exception.getStatus());
                assertEquals("https://localhost:8000/predict", exception.getEndpoint());
                assertEquals("Invalid input data format.", exception.getDetail());

                verify(analyzerService).predict(eq(OAuthProvider.GITHUB), eq("github123"), eq(1L),
                                eq(testPredictionData));
        }

        @Test
        void predict_AnalyzerServiceException_NetworkError() {
                // Given
                AnalyzerServiceException analyzerException = new AnalyzerServiceException(
                                0, "https://localhost:8000/predict", "Analyzer service unreachable",
                                "Read timeout", null);

                when(analyzerService.predict(eq(OAuthProvider.GITHUB), eq("github123"), eq(1L), eq(testPredictionData)))
                                .thenThrow(analyzerException);

                // When & Then
                AnalyzerServiceException exception = assertThrows(AnalyzerServiceException.class,
                                () -> analyzerController.predict(mockAuthentication, 1L, testPredictionData));

                assertEquals(0, exception.getStatus());
                assertEquals("https://localhost:8000/predict", exception.getEndpoint());
                assertEquals("Analyzer service unreachable", exception.getDetail());

                verify(analyzerService).predict(eq(OAuthProvider.GITHUB), eq("github123"), eq(1L),
                                eq(testPredictionData));
        }

        @Test
        void predict_IllegalArgumentException_ModelNotFound() {
                // Given
                when(analyzerService.predict(eq(OAuthProvider.GITHUB), eq("github123"), eq(999L),
                                eq(testPredictionData)))
                                .thenThrow(new IllegalArgumentException("Modelo no encontrado"));

                // When & Then
                IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                                () -> analyzerController.predict(mockAuthentication, 999L, testPredictionData));

                assertEquals("Modelo no encontrado", exception.getMessage());

                verify(analyzerService).predict(eq(OAuthProvider.GITHUB), eq("github123"), eq(999L),
                                eq(testPredictionData));
        }

        @Test
        void predict_EmptyData() {
                // Given
                Map<String, Object> emptyData = new HashMap<>();
                when(analyzerService.predict(eq(OAuthProvider.GITHUB), eq("github123"), eq(1L), eq(emptyData)))
                                .thenReturn(testPredictionResult);

                // When
                ResponseEntity<Map<String, Object>> response = analyzerController.predict(
                                mockAuthentication, 1L, emptyData);

                // Then
                assertEquals(HttpStatus.OK, response.getStatusCode());
                assertEquals(testPredictionResult, response.getBody());

                verify(analyzerService).predict(eq(OAuthProvider.GITHUB), eq("github123"), eq(1L), eq(emptyData));
        }

        @Test
        void predict_GoogleOAuthProvider() {
                // Given
                when(mockAuthentication.getAuthorizedClientRegistrationId()).thenReturn("google");
                when(analyzerService.predict(eq(OAuthProvider.GOOGLE), eq("github123"), eq(1L), eq(testPredictionData)))
                                .thenReturn(testPredictionResult);

                // When
                ResponseEntity<Map<String, Object>> response = analyzerController.predict(
                                mockAuthentication, 1L, testPredictionData);

                // Then
                assertEquals(HttpStatus.OK, response.getStatusCode());
                assertEquals(testPredictionResult, response.getBody());

                verify(analyzerService).predict(eq(OAuthProvider.GOOGLE), eq("github123"), eq(1L),
                                eq(testPredictionData));
        }

        @Test
        void predict_SystemOAuthProvider() {
                // Given
                when(mockAuthentication.getAuthorizedClientRegistrationId()).thenReturn("system");
                when(analyzerService.predict(eq(OAuthProvider.SYSTEM), eq("github123"), eq(1L), eq(testPredictionData)))
                                .thenReturn(testPredictionResult);

                // When
                ResponseEntity<Map<String, Object>> response = analyzerController.predict(
                                mockAuthentication, 1L, testPredictionData);

                // Then
                assertEquals(HttpStatus.OK, response.getStatusCode());
                assertEquals(testPredictionResult, response.getBody());

                verify(analyzerService).predict(eq(OAuthProvider.SYSTEM), eq("github123"), eq(1L),
                                eq(testPredictionData));
        }

        @Test
        void predict_DifferentModelIds() {
                // Given
                Long[] modelIds = { 1L, 100L, 999L };

                for (Long modelId : modelIds) {
                        when(analyzerService.predict(eq(OAuthProvider.GITHUB), eq("github123"), eq(modelId),
                                        eq(testPredictionData)))
                                        .thenReturn(testPredictionResult);

                        // When
                        ResponseEntity<Map<String, Object>> response = analyzerController.predict(
                                        mockAuthentication, modelId, testPredictionData);

                        // Then
                        assertEquals(HttpStatus.OK, response.getStatusCode());
                        assertEquals(testPredictionResult, response.getBody());

                        verify(analyzerService).predict(eq(OAuthProvider.GITHUB), eq("github123"), eq(modelId),
                                        eq(testPredictionData));
                }
        }

        @Test
        void generateSchema_DifferentUserNames() {
                // Given
                String[] userNames = { "user1", "user2", "testuser" };

                for (String userName : userNames) {
                        when(mockOAuth2User.getName()).thenReturn(userName);
                        when(analyzerService.generateInputSignature(eq(OAuthProvider.GITHUB), eq(userName),
                                        eq(mockModelFile), isNull()))
                                        .thenReturn(testInputSignature);

                        // When
                        ResponseEntity<Map<String, Object>> response = analyzerController.generateSchema(
                                        mockAuthentication, mockModelFile, null);

                        // Then
                        assertEquals(HttpStatus.OK, response.getStatusCode());
                        assertEquals(testInputSignature, response.getBody());

                        verify(analyzerService).generateInputSignature(eq(OAuthProvider.GITHUB), eq(userName),
                                        eq(mockModelFile), isNull());
                }
        }
}
