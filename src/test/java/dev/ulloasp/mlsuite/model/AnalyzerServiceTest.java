package dev.ulloasp.mlsuite.model;
/*
 * import static org.junit.jupiter.api.Assertions.assertEquals;
 * import static org.junit.jupiter.api.Assertions.assertNotNull;
 * import static org.junit.jupiter.api.Assertions.assertThrows;
 * import static org.junit.jupiter.api.Assertions.assertTrue;
 * import static org.mockito.ArgumentMatchers.any;
 * import static org.mockito.ArgumentMatchers.eq;
 * import static org.mockito.Mockito.mock;
 * import static org.mockito.Mockito.never;
 * import static org.mockito.Mockito.verify;
 * import static org.mockito.Mockito.verifyNoInteractions;
 * import static org.mockito.Mockito.when;
 * 
 * import java.io.IOException;
 * import java.lang.reflect.Field;
 * import java.time.OffsetDateTime;
 * import java.util.HashMap;
 * import java.util.Map;
 * import java.util.Optional;
 * 
 * import org.junit.jupiter.api.BeforeEach;
 * import org.junit.jupiter.api.Test;
 * import org.junit.jupiter.api.extension.ExtendWith;
 * import org.mockito.InjectMocks;
 * import org.mockito.Mock;
 * import org.mockito.junit.jupiter.MockitoExtension;
 * import org.springframework.http.HttpEntity;
 * import org.springframework.web.client.ResourceAccessException;
 * import org.springframework.web.client.RestClientResponseException;
 * import org.springframework.web.client.RestTemplate;
 * import org.springframework.web.multipart.MultipartFile;
 * 
 * import dev.ulloasp.mlsuite.model.entities.Model;
 * import dev.ulloasp.mlsuite.model.exceptions.AnalyzerServiceException;
 * import dev.ulloasp.mlsuite.model.repositories.ModelRepository;
 * import dev.ulloasp.mlsuite.model.services.AnalyzerServiceImpl;
 * import dev.ulloasp.mlsuite.user.entity.OAuthProvider;
 * import dev.ulloasp.mlsuite.user.entity.User;
 * 
 * @ExtendWith(MockitoExtension.class)
 * class AnalyzerServiceTest {
 * 
 * @Mock
 * private RestTemplate restTemplate;
 * 
 * @Mock
 * private ModelRepository modelRepository;
 * 
 * @Mock
 * private MultipartFile mockModelFile;
 * 
 * @Mock
 * private MultipartFile mockDataframe;
 * 
 * @InjectMocks
 * private AnalyzerServiceImpl analyzerService;
 * 
 * private User testUser;
 * private Model testModel;
 * private Map<String, Object> testInputSignature;
 * private Map<String, Object> testPredictionData;
 * private Map<String, Object> testPredictionResult;
 * 
 * @BeforeEach
 * void setUp() throws Exception {
 * // Inject RestTemplate using reflection since it uses @Autowired
 * Field restTemplateField =
 * AnalyzerServiceImpl.class.getDeclaredField("restTemplate");
 * restTemplateField.setAccessible(true);
 * restTemplateField.set(analyzerService, restTemplate);
 * 
 * testUser = new User();
 * testUser.setId(1L);
 * testUser.setUsername("testuser");
 * testUser.setEmail("test@example.com");
 * testUser.setFullName("Test User");
 * testUser.setOauthProvider(OAuthProvider.GITHUB);
 * testUser.setOauthId("github123");
 * testUser.setAvatarUrl("https://example.com/avatar.jpg");
 * testUser.setCreatedAt(OffsetDateTime.now());
 * testUser.setUpdatedAt(OffsetDateTime.now());
 * 
 * testModel = new Model();
 * testModel.setId(1L);
 * testModel.setName("Test Model");
 * testModel.setType("classification");
 * testModel.setSpecificType("random_forest");
 * testModel.setFileName("model.pkl");
 * testModel.setModelFile(new byte[] { 1, 2, 3, 4, 5 });
 * testModel.setUser(testUser);
 * testModel.setCreatedAt(OffsetDateTime.now());
 * testModel.setUpdatedAt(OffsetDateTime.now());
 * 
 * testInputSignature = new HashMap<>();
 * testInputSignature.put("feature1", "float64");
 * testInputSignature.put("feature2", "int64");
 * testInputSignature.put("feature3", "object");
 * 
 * testPredictionData = new HashMap<>();
 * testPredictionData.put("feature1", 1.5);
 * testPredictionData.put("feature2", 10);
 * testPredictionData.put("feature3", "category_a");
 * 
 * testPredictionResult = new HashMap<>();
 * testPredictionResult.put("prediction", "positive");
 * testPredictionResult.put("probability", 0.85);
 * testPredictionResult.put("confidence", 0.92);
 * }
 * 
 * // Tests for generateInputSignature method
 * 
 * @Test
 * void generateInputSignature_Success_WithModelAndDataframe() throws
 * IOException {
 * // Given
 * when(mockModelFile.getResource()).thenReturn(mock(org.springframework.core.io
 * .Resource.class));
 * when(mockDataframe.getResource()).thenReturn(mock(org.springframework.core.io
 * .Resource.class));
 * when(restTemplate.postForObject(eq("https://localhost:8000/build_schema"),
 * any(HttpEntity.class), eq(Map.class)))
 * .thenReturn(testInputSignature);
 * 
 * // When
 * Map<String, Object> result = analyzerService.generateInputSignature(
 * OAuthProvider.GITHUB, "github123", mockModelFile, mockDataframe);
 * 
 * // Then
 * assertNotNull(result);
 * assertEquals(testInputSignature, result);
 * assertEquals("float64", result.get("feature1"));
 * assertEquals("int64", result.get("feature2"));
 * assertEquals("object", result.get("feature3"));
 * 
 * verify(restTemplate).postForObject(eq("https://localhost:8000/build_schema"),
 * any(HttpEntity.class),
 * eq(Map.class));
 * verify(mockModelFile).getResource();
 * verify(mockDataframe).getResource();
 * }
 * 
 * @Test
 * void generateInputSignature_Success_WithModelOnly() throws IOException {
 * // Given
 * when(mockModelFile.getResource()).thenReturn(mock(org.springframework.core.io
 * .Resource.class));
 * when(restTemplate.postForObject(eq("https://localhost:8000/build_schema"),
 * any(HttpEntity.class), eq(Map.class)))
 * .thenReturn(testInputSignature);
 * 
 * // When
 * Map<String, Object> result = analyzerService.generateInputSignature(
 * OAuthProvider.GITHUB, "github123", mockModelFile, null);
 * 
 * // Then
 * assertNotNull(result);
 * assertEquals(testInputSignature, result);
 * 
 * verify(restTemplate).postForObject(eq("https://localhost:8000/build_schema"),
 * any(HttpEntity.class),
 * eq(Map.class));
 * verify(mockModelFile).getResource();
 * verify(mockDataframe, never()).getResource();
 * }
 * 
 * @Test
 * void
 * generateInputSignature_RestClientException_ThrowsAnalyzerServiceException()
 * throws IOException {
 * // Given
 * when(mockModelFile.getResource()).thenReturn(mock(org.springframework.core.io
 * .Resource.class));
 * 
 * RestClientResponseException restException = new RestClientResponseException(
 * "Bad Request", 400, "Bad Request", null,
 * "{\"detail\": \"Not a sklearn estimator.\"}".getBytes(), null);
 * 
 * when(restTemplate.postForObject(eq("https://localhost:8000/build_schema"),
 * any(HttpEntity.class), eq(Map.class)))
 * .thenThrow(restException);
 * 
 * // When & Then
 * AnalyzerServiceException exception =
 * assertThrows(AnalyzerServiceException.class,
 * () -> analyzerService.generateInputSignature(OAuthProvider.GITHUB,
 * "github123", mockModelFile, null));
 * 
 * assertEquals(400, exception.getStatus());
 * assertEquals("https://localhost:8000/build_schema", exception.getEndpoint());
 * assertEquals("Not a sklearn estimator.", exception.getDetail());
 * assertTrue(exception.getRawBody().contains("Not a sklearn estimator."));
 * 
 * verify(restTemplate).postForObject(eq("https://localhost:8000/build_schema"),
 * any(HttpEntity.class),
 * eq(Map.class));
 * }
 * 
 * @Test
 * void
 * generateInputSignature_ResourceAccessException_ThrowsAnalyzerServiceException
 * () throws IOException {
 * // Given
 * when(mockModelFile.getResource()).thenReturn(mock(org.springframework.core.io
 * .Resource.class));
 * 
 * ResourceAccessException networkException = new
 * ResourceAccessException("Connection refused");
 * 
 * when(restTemplate.postForObject(eq("https://localhost:8000/build_schema"),
 * any(HttpEntity.class), eq(Map.class)))
 * .thenThrow(networkException);
 * 
 * // When & Then
 * AnalyzerServiceException exception =
 * assertThrows(AnalyzerServiceException.class,
 * () -> analyzerService.generateInputSignature(OAuthProvider.GITHUB,
 * "github123", mockModelFile, null));
 * 
 * assertEquals(0, exception.getStatus());
 * assertEquals("https://localhost:8000/build_schema", exception.getEndpoint());
 * assertEquals("Analyzer service unreachable", exception.getDetail());
 * assertTrue(exception.getRawBody().contains("Connection refused"));
 * 
 * verify(restTemplate).postForObject(eq("https://localhost:8000/build_schema"),
 * any(HttpEntity.class),
 * eq(Map.class));
 * }
 * 
 * // Tests for predict method
 * 
 * @Test
 * void predict_Success() {
 * // Given
 * when(modelRepository.findById(1L)).thenReturn(Optional.of(testModel));
 * when(restTemplate.postForObject(eq("https://localhost:8000/predict"),
 * any(HttpEntity.class), eq(Map.class)))
 * .thenReturn(testPredictionResult);
 * 
 * // When
 * Map<String, Object> result = analyzerService.predict(
 * OAuthProvider.GITHUB, "github123", 1L, testPredictionData);
 * 
 * // Then
 * assertNotNull(result);
 * assertEquals(testPredictionResult, result);
 * assertEquals("positive", result.get("prediction"));
 * assertEquals(0.85, result.get("probability"));
 * assertEquals(0.92, result.get("confidence"));
 * 
 * verify(modelRepository).findById(1L);
 * verify(restTemplate).postForObject(eq("https://localhost:8000/predict"),
 * any(HttpEntity.class), eq(Map.class));
 * }
 * 
 * @Test
 * void predict_ModelNotFound_ThrowsIllegalArgumentException() {
 * // Given
 * when(modelRepository.findById(999L)).thenReturn(Optional.empty());
 * 
 * // When & Then
 * IllegalArgumentException exception =
 * assertThrows(IllegalArgumentException.class,
 * () -> analyzerService.predict(OAuthProvider.GITHUB, "github123", 999L,
 * testPredictionData));
 * 
 * assertEquals("Modelo no encontrado", exception.getMessage());
 * 
 * verify(modelRepository).findById(999L);
 * verifyNoInteractions(restTemplate);
 * }
 * 
 * @Test
 * void predict_RestClientException_ThrowsAnalyzerServiceException() {
 * // Given
 * when(modelRepository.findById(1L)).thenReturn(Optional.of(testModel));
 * 
 * RestClientResponseException restException = new RestClientResponseException(
 * "Unprocessable Entity", 422, "Unprocessable Entity", null,
 * "{\"detail\": \"Invalid input data format.\"}".getBytes(), null);
 * 
 * when(restTemplate.postForObject(eq("https://localhost:8000/predict"),
 * any(HttpEntity.class), eq(Map.class)))
 * .thenThrow(restException);
 * 
 * // When & Then
 * AnalyzerServiceException exception =
 * assertThrows(AnalyzerServiceException.class,
 * () -> analyzerService.predict(OAuthProvider.GITHUB, "github123", 1L,
 * testPredictionData));
 * 
 * assertEquals(422, exception.getStatus());
 * assertEquals("https://localhost:8000/predict", exception.getEndpoint());
 * assertEquals("Invalid input data format.", exception.getDetail());
 * assertTrue(exception.getRawBody().contains("Invalid input data format."));
 * 
 * verify(modelRepository).findById(1L);
 * verify(restTemplate).postForObject(eq("https://localhost:8000/predict"),
 * any(HttpEntity.class), eq(Map.class));
 * }
 * 
 * @Test
 * void predict_ResourceAccessException_ThrowsAnalyzerServiceException() {
 * // Given
 * when(modelRepository.findById(1L)).thenReturn(Optional.of(testModel));
 * 
 * ResourceAccessException networkException = new
 * ResourceAccessException("Read timeout");
 * 
 * when(restTemplate.postForObject(eq("https://localhost:8000/predict"),
 * any(HttpEntity.class), eq(Map.class)))
 * .thenThrow(networkException);
 * 
 * // When & Then
 * AnalyzerServiceException exception =
 * assertThrows(AnalyzerServiceException.class,
 * () -> analyzerService.predict(OAuthProvider.GITHUB, "github123", 1L,
 * testPredictionData));
 * 
 * assertEquals(0, exception.getStatus());
 * assertEquals("https://localhost:8000/predict", exception.getEndpoint());
 * assertEquals("Analyzer service unreachable", exception.getDetail());
 * assertTrue(exception.getRawBody().contains("Read timeout"));
 * 
 * verify(modelRepository).findById(1L);
 * verify(restTemplate).postForObject(eq("https://localhost:8000/predict"),
 * any(HttpEntity.class), eq(Map.class));
 * }
 * 
 * @Test
 * void predict_JsonSerializationError_ThrowsRuntimeException() {
 * // Given
 * when(modelRepository.findById(1L)).thenReturn(Optional.of(testModel));
 * 
 * // Create a map with an object that can't be serialized to JSON
 * Map<String, Object> invalidData = new HashMap<>();
 * invalidData.put("invalid", new Object() {
 * 
 * @Override
 * public String toString() {
 * throw new RuntimeException("Serialization error");
 * }
 * });
 * 
 * // When & Then
 * RuntimeException exception = assertThrows(RuntimeException.class,
 * () -> analyzerService.predict(OAuthProvider.GITHUB, "github123", 1L,
 * invalidData));
 * 
 * assertTrue(exception.getMessage().
 * contains("Error al serializar los datos a JSON"));
 * 
 * verify(modelRepository).findById(1L);
 * verifyNoInteractions(restTemplate);
 * }
 * 
 * @Test
 * void generateInputSignature_ValidationErrorArray_ParsesCorrectly() throws
 * IOException {
 * // Given
 * when(mockModelFile.getResource()).thenReturn(mock(org.springframework.core.io
 * .Resource.class));
 * 
 * String validationErrorResponse = """
 * {
 * "detail": [
 * {"loc": ["body", "model_file"], "msg": "field required", "type":
 * "value_error.missing"},
 * {"loc": ["body", "df_file"], "msg": "invalid file format", "type":
 * "value_error.format"}
 * ]
 * }
 * """;
 * 
 * RestClientResponseException restException = new RestClientResponseException(
 * "Unprocessable Entity", 422, "Unprocessable Entity", null,
 * validationErrorResponse.getBytes(), null);
 * 
 * when(restTemplate.postForObject(eq("https://localhost:8000/build_schema"),
 * any(HttpEntity.class), eq(Map.class)))
 * .thenThrow(restException);
 * 
 * // When & Then
 * AnalyzerServiceException exception =
 * assertThrows(AnalyzerServiceException.class,
 * () -> analyzerService.generateInputSignature(OAuthProvider.GITHUB,
 * "github123", mockModelFile, null));
 * 
 * assertEquals(422, exception.getStatus());
 * assertEquals("https://localhost:8000/build_schema", exception.getEndpoint());
 * assertTrue(exception.getDetail().contains("field required"));
 * assertTrue(exception.getDetail().contains("invalid file format"));
 * 
 * verify(restTemplate).postForObject(eq("https://localhost:8000/build_schema"),
 * any(HttpEntity.class),
 * eq(Map.class));
 * }
 * 
 * @Test
 * void predict_EmptyData_Success() {
 * // Given
 * Map<String, Object> emptyData = new HashMap<>();
 * when(modelRepository.findById(1L)).thenReturn(Optional.of(testModel));
 * when(restTemplate.postForObject(eq("https://localhost:8000/predict"),
 * any(HttpEntity.class), eq(Map.class)))
 * .thenReturn(testPredictionResult);
 * 
 * // When
 * Map<String, Object> result = analyzerService.predict(
 * OAuthProvider.GITHUB, "github123", 1L, emptyData);
 * 
 * // Then
 * assertNotNull(result);
 * assertEquals(testPredictionResult, result);
 * 
 * verify(modelRepository).findById(1L);
 * verify(restTemplate).postForObject(eq("https://localhost:8000/predict"),
 * any(HttpEntity.class), eq(Map.class));
 * }
 * 
 * @Test
 * void generateInputSignature_EmptyResponseBody_HandlesGracefully() throws
 * IOException {
 * // Given
 * when(mockModelFile.getResource()).thenReturn(mock(org.springframework.core.io
 * .Resource.class));
 * 
 * RestClientResponseException restException = new RestClientResponseException(
 * "Internal Server Error", 500, "Internal Server Error", null,
 * "".getBytes(), null);
 * 
 * when(restTemplate.postForObject(eq("https://localhost:8000/build_schema"),
 * any(HttpEntity.class), eq(Map.class)))
 * .thenThrow(restException);
 * 
 * // When & Then
 * AnalyzerServiceException exception =
 * assertThrows(AnalyzerServiceException.class,
 * () -> analyzerService.generateInputSignature(OAuthProvider.GITHUB,
 * "github123", mockModelFile, null));
 * 
 * assertEquals(500, exception.getStatus());
 * assertEquals("https://localhost:8000/build_schema", exception.getEndpoint());
 * assertEquals("Analyzer service error", exception.getMessage()); // Default
 * message when detail is empty
 * 
 * verify(restTemplate).postForObject(eq("https://localhost:8000/build_schema"),
 * any(HttpEntity.class),
 * eq(Map.class));
 * }
 * }
 */