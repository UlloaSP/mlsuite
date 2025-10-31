package dev.ulloasp.mlsuite.signature;

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

import dev.ulloasp.mlsuite.model.entities.Model;
import dev.ulloasp.mlsuite.signature.controllers.SignatureControllerImpl;
import dev.ulloasp.mlsuite.signature.dtos.CreateSignatureParams;
import dev.ulloasp.mlsuite.signature.dtos.SignatureDto;
import dev.ulloasp.mlsuite.signature.entities.Signature;
import dev.ulloasp.mlsuite.signature.exceptions.SignatureAlreadyExistsException;
import dev.ulloasp.mlsuite.signature.exceptions.SignatureDoesNotExistsException;
import dev.ulloasp.mlsuite.signature.exceptions.SignatureNotFromUserException;
import dev.ulloasp.mlsuite.signature.exceptions.SignatureNotSemVerException;
import dev.ulloasp.mlsuite.signature.services.SignatureService;
import dev.ulloasp.mlsuite.user.entity.OAuthProvider;
import dev.ulloasp.mlsuite.util.ErrorDto;
import jakarta.servlet.http.HttpServletRequest;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class SignatureControllerTest {

    @Mock
    private SignatureService signatureService;

    @Mock
    private OAuth2AuthenticationToken mockAuthentication;

    @Mock
    private OAuth2User mockOAuth2User;

    @Mock
    private HttpServletRequest mockRequest;

    @InjectMocks
    private SignatureControllerImpl signatureController;

    private Signature testSignature;
    private Model testModel;
    private CreateSignatureParams testCreateParams;
    private Map<String, Object> testInputSignature;

    @BeforeEach
    void setUp() {
        // Setup test model
        testModel = new Model();
        testModel.setId(1L);

        // Setup test input signature
        testInputSignature = new HashMap<>();
        testInputSignature.put("feature1", "float64");
        testInputSignature.put("feature2", "int64");
        testInputSignature.put("feature3", "object");

        // Setup test signature
        testSignature = new Signature();
        testSignature.setId(1L);
        testSignature.setModel(testModel);
        testSignature.setName("Test Signature");
        testSignature.setMajor(1);
        testSignature.setMinor(0);
        testSignature.setPatch(0);
        testSignature.setInputSignature(testInputSignature);
        testSignature.setOrigin(null);
        testSignature.setCreatedAt(OffsetDateTime.of(2024, 1, 15, 10, 30, 0, 0, ZoneOffset.UTC));

        // Setup test create params
        testCreateParams = new CreateSignatureParams();
        testCreateParams.setModelId(1L);
        testCreateParams.setName("Test Signature");
        testCreateParams.setMajor(1);
        testCreateParams.setMinor(0);
        testCreateParams.setPatch(0);
        testCreateParams.setInputSignature(testInputSignature);
        testCreateParams.setOrigin(null);

        // Setup mock request
        when(mockRequest.getRequestURI()).thenReturn("/api/signature");
    }

    // Tests for createSignature method

    @Test
    void createSignature_Success_GitHubProvider() {
        // Given
        when(mockAuthentication.getAuthorizedClientRegistrationId()).thenReturn("github");
        when(mockAuthentication.getPrincipal()).thenReturn(mockOAuth2User);
        when(mockOAuth2User.getName()).thenReturn("github123");

        when(signatureService.createSignature(
                eq(OAuthProvider.GITHUB), eq("github123"), eq(1L), eq(testInputSignature),
                eq("Test Signature"), eq(1), eq(0), eq(0), isNull()))
                .thenReturn(testSignature);

        // When
        ResponseEntity<SignatureDto> response = signatureController.createSignature(mockAuthentication,
                testCreateParams);

        // Then
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());

        SignatureDto signatureDto = response.getBody();
        assertNotNull(signatureDto);
        assertEquals(1L, signatureDto.getId());
        assertEquals(1L, signatureDto.getModelId());
        assertEquals("Test Signature", signatureDto.getName());
        assertEquals(1, signatureDto.getMajor());
        assertEquals(0, signatureDto.getMinor());
        assertEquals(0, signatureDto.getPatch());
        assertEquals(testInputSignature, signatureDto.getInputSignature());
        assertNull(signatureDto.getOrigin());

        verify(signatureService).createSignature(
                eq(OAuthProvider.GITHUB), eq("github123"), eq(1L), eq(testInputSignature),
                eq("Test Signature"), eq(1), eq(0), eq(0), isNull());
    }

    @Test
    void createSignature_Success_WithOrigin() {
        // Given
        when(mockAuthentication.getAuthorizedClientRegistrationId()).thenReturn("github");
        when(mockAuthentication.getPrincipal()).thenReturn(mockOAuth2User);
        when(mockOAuth2User.getName()).thenReturn("github123");

        // Setup origin signature
        Signature originSignature = new Signature();
        originSignature.setId(2L);
        testSignature.setOrigin(originSignature);
        testCreateParams.setOrigin(2L);

        when(signatureService.createSignature(
                eq(OAuthProvider.GITHUB), eq("github123"), eq(1L), eq(testInputSignature),
                eq("Test Signature"), eq(1), eq(0), eq(0), eq(2L)))
                .thenReturn(testSignature);

        // When
        ResponseEntity<SignatureDto> response = signatureController.createSignature(mockAuthentication,
                testCreateParams);

        // Then
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());

        SignatureDto signatureDto = response.getBody();
        assertNotNull(signatureDto);
        assertEquals(2L, signatureDto.getOrigin());

        verify(signatureService).createSignature(
                eq(OAuthProvider.GITHUB), eq("github123"), eq(1L), eq(testInputSignature),
                eq("Test Signature"), eq(1), eq(0), eq(0), eq(2L));
    }

    @Test
    void createSignature_Success_GoogleProvider() {
        // Given
        when(mockAuthentication.getAuthorizedClientRegistrationId()).thenReturn("google");
        when(mockAuthentication.getPrincipal()).thenReturn(mockOAuth2User);
        when(mockOAuth2User.getName()).thenReturn("google456");

        when(signatureService.createSignature(
                eq(OAuthProvider.GOOGLE), eq("google456"), eq(1L), eq(testInputSignature),
                eq("Test Signature"), eq(1), eq(0), eq(0), isNull()))
                .thenReturn(testSignature);

        // When
        ResponseEntity<SignatureDto> response = signatureController.createSignature(mockAuthentication,
                testCreateParams);

        // Then
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());

        verify(signatureService).createSignature(
                eq(OAuthProvider.GOOGLE), eq("google456"), eq(1L), eq(testInputSignature),
                eq("Test Signature"), eq(1), eq(0), eq(0), isNull());
    }

    @Test
    void createSignature_SignatureAlreadyExistsException_ByInputSignature() {
        // Given
        when(mockAuthentication.getAuthorizedClientRegistrationId()).thenReturn("github");
        when(mockAuthentication.getPrincipal()).thenReturn(mockOAuth2User);
        when(mockOAuth2User.getName()).thenReturn("github123");

        SignatureAlreadyExistsException exception = new SignatureAlreadyExistsException(1L, testInputSignature);
        when(signatureService.createSignature(
                eq(OAuthProvider.GITHUB), eq("github123"), eq(1L), eq(testInputSignature),
                eq("Test Signature"), eq(1), eq(0), eq(0), isNull()))
                .thenThrow(exception);

        // When & Then
        SignatureAlreadyExistsException thrownException = assertThrows(SignatureAlreadyExistsException.class,
                () -> signatureController.createSignature(mockAuthentication, testCreateParams));

        assertTrue(thrownException.getMessage().contains("already exists for model ID: 1"));
        assertTrue(thrownException.getMessage().contains(testInputSignature.toString()));

        verify(signatureService).createSignature(
                eq(OAuthProvider.GITHUB), eq("github123"), eq(1L), eq(testInputSignature),
                eq("Test Signature"), eq(1), eq(0), eq(0), isNull());
    }

    @Test
    void createSignature_SignatureAlreadyExistsException_ByVersion() {
        // Given
        when(mockAuthentication.getAuthorizedClientRegistrationId()).thenReturn("github");
        when(mockAuthentication.getPrincipal()).thenReturn(mockOAuth2User);
        when(mockOAuth2User.getName()).thenReturn("github123");

        SignatureAlreadyExistsException exception = new SignatureAlreadyExistsException(1L, 1, 0, 0);
        when(signatureService.createSignature(
                eq(OAuthProvider.GITHUB), eq("github123"), eq(1L), eq(testInputSignature),
                eq("Test Signature"), eq(1), eq(0), eq(0), isNull()))
                .thenThrow(exception);

        // When & Then
        SignatureAlreadyExistsException thrownException = assertThrows(SignatureAlreadyExistsException.class,
                () -> signatureController.createSignature(mockAuthentication, testCreateParams));

        assertTrue(thrownException.getMessage().contains("version '1.0.0 already exists for model ID: 1"));

        verify(signatureService).createSignature(
                eq(OAuthProvider.GITHUB), eq("github123"), eq(1L), eq(testInputSignature),
                eq("Test Signature"), eq(1), eq(0), eq(0), isNull());
    }

    @Test
    void createSignature_SignatureNotSemVerException() {
        // Given
        when(mockAuthentication.getAuthorizedClientRegistrationId()).thenReturn("github");
        when(mockAuthentication.getPrincipal()).thenReturn(mockOAuth2User);
        when(mockOAuth2User.getName()).thenReturn("github123");

        SignatureNotSemVerException exception = new SignatureNotSemVerException("Invalid Name");
        when(signatureService.createSignature(
                eq(OAuthProvider.GITHUB), eq("github123"), eq(1L), eq(testInputSignature),
                eq("Test Signature"), eq(1), eq(0), eq(0), isNull()))
                .thenThrow(exception);

        // When & Then
        SignatureNotSemVerException thrownException = assertThrows(SignatureNotSemVerException.class,
                () -> signatureController.createSignature(mockAuthentication, testCreateParams));

        assertTrue(thrownException.getMessage().contains("Cannot create signature with name 'Invalid Name'"));
        assertTrue(thrownException.getMessage().contains("not a valid semantic versioning"));

        verify(signatureService).createSignature(
                eq(OAuthProvider.GITHUB), eq("github123"), eq(1L), eq(testInputSignature),
                eq("Test Signature"), eq(1), eq(0), eq(0), isNull());
    }

    // Tests for getAllSignatures method

    @Test
    void getAllSignatures_Success() {
        // Given
        when(mockAuthentication.getAuthorizedClientRegistrationId()).thenReturn("github");
        when(mockAuthentication.getPrincipal()).thenReturn(mockOAuth2User);
        when(mockOAuth2User.getName()).thenReturn("github123");

        Signature signature2 = new Signature();
        signature2.setId(2L);
        signature2.setModel(testModel);
        signature2.setName("Second Signature");
        signature2.setMajor(1);
        signature2.setMinor(1);
        signature2.setPatch(0);
        signature2.setInputSignature(testInputSignature);
        signature2.setCreatedAt(OffsetDateTime.of(2024, 2, 15, 10, 30, 0, 0, ZoneOffset.UTC));

        List<Signature> signatures = Arrays.asList(testSignature, signature2);
        when(signatureService.getSignatureByModelId(eq(OAuthProvider.GITHUB), eq("github123"), eq(1L)))
                .thenReturn(signatures);

        // When
        ResponseEntity<List<SignatureDto>> response = signatureController.getAllSignatures(mockAuthentication, 1L);

        // Then
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());

        List<SignatureDto> signatureDtos = response.getBody();
        assertNotNull(signatureDtos);
        assertEquals(2, signatureDtos.size());

        SignatureDto firstDto = signatureDtos.get(0);
        assertEquals(1L, firstDto.getId());
        assertEquals("Test Signature", firstDto.getName());
        assertEquals(1, firstDto.getMajor());
        assertEquals(0, firstDto.getMinor());
        assertEquals(0, firstDto.getPatch());

        SignatureDto secondDto = signatureDtos.get(1);
        assertEquals(2L, secondDto.getId());
        assertEquals("Second Signature", secondDto.getName());
        assertEquals(1, secondDto.getMajor());
        assertEquals(1, secondDto.getMinor());
        assertEquals(0, secondDto.getPatch());

        verify(signatureService).getSignatureByModelId(eq(OAuthProvider.GITHUB), eq("github123"), eq(1L));
    }

    @Test
    void getAllSignatures_Success_EmptyList() {
        // Given
        when(mockAuthentication.getAuthorizedClientRegistrationId()).thenReturn("github");
        when(mockAuthentication.getPrincipal()).thenReturn(mockOAuth2User);
        when(mockOAuth2User.getName()).thenReturn("github123");

        when(signatureService.getSignatureByModelId(eq(OAuthProvider.GITHUB), eq("github123"), eq(999L)))
                .thenReturn(Arrays.asList());

        // When
        ResponseEntity<List<SignatureDto>> response = signatureController.getAllSignatures(mockAuthentication, 999L);

        // Then
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());

        List<SignatureDto> signatureDtos = response.getBody();
        assertNotNull(signatureDtos);
        assertTrue(signatureDtos.isEmpty());

        verify(signatureService).getSignatureByModelId(eq(OAuthProvider.GITHUB), eq("github123"), eq(999L));
    }

    @Test
    void getAllSignatures_Success_SystemProvider() {
        // Given
        when(mockAuthentication.getAuthorizedClientRegistrationId()).thenReturn("system");
        when(mockAuthentication.getPrincipal()).thenReturn(mockOAuth2User);
        when(mockOAuth2User.getName()).thenReturn("system789");

        List<Signature> signatures = Arrays.asList(testSignature);
        when(signatureService.getSignatureByModelId(eq(OAuthProvider.SYSTEM), eq("system789"), eq(1L)))
                .thenReturn(signatures);

        // When
        ResponseEntity<List<SignatureDto>> response = signatureController.getAllSignatures(mockAuthentication, 1L);

        // Then
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());

        List<SignatureDto> signatureDtos = response.getBody();
        assertNotNull(signatureDtos);
        assertEquals(1, signatureDtos.size());

        verify(signatureService).getSignatureByModelId(eq(OAuthProvider.SYSTEM), eq("system789"), eq(1L));
    }

    // Tests for getSignatureById method

    @Test
    void getSignatureById_Success() {
        // Given
        when(mockAuthentication.getAuthorizedClientRegistrationId()).thenReturn("github");
        when(mockAuthentication.getPrincipal()).thenReturn(mockOAuth2User);
        when(mockOAuth2User.getName()).thenReturn("github123");

        when(signatureService.getSignature(eq(OAuthProvider.GITHUB), eq("github123"), eq(1L)))
                .thenReturn(testSignature);

        // When
        ResponseEntity<SignatureDto> response = signatureController.getSignatureById(mockAuthentication, 1L);

        // Then
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());

        SignatureDto signatureDto = response.getBody();
        assertNotNull(signatureDto);
        assertEquals(1L, signatureDto.getId());
        assertEquals(1L, signatureDto.getModelId());
        assertEquals("Test Signature", signatureDto.getName());
        assertEquals(testInputSignature, signatureDto.getInputSignature());

        verify(signatureService).getSignature(eq(OAuthProvider.GITHUB), eq("github123"), eq(1L));
    }

    @Test
    void getSignatureById_SignatureDoesNotExistsException() {
        // Given
        when(mockAuthentication.getAuthorizedClientRegistrationId()).thenReturn("github");
        when(mockAuthentication.getPrincipal()).thenReturn(mockOAuth2User);
        when(mockOAuth2User.getName()).thenReturn("github123");

        SignatureDoesNotExistsException exception = new SignatureDoesNotExistsException(999L);
        when(signatureService.getSignature(eq(OAuthProvider.GITHUB), eq("github123"), eq(999L)))
                .thenThrow(exception);

        // When & Then
        SignatureDoesNotExistsException thrownException = assertThrows(SignatureDoesNotExistsException.class,
                () -> signatureController.getSignatureById(mockAuthentication, 999L));

        assertEquals("Signature with ID '999' does not exist.", thrownException.getMessage());

        verify(signatureService).getSignature(eq(OAuthProvider.GITHUB), eq("github123"), eq(999L));
    }

    @Test
    void getSignatureById_SignatureNotFromUserException() {
        // Given
        when(mockAuthentication.getAuthorizedClientRegistrationId()).thenReturn("github");
        when(mockAuthentication.getPrincipal()).thenReturn(mockOAuth2User);
        when(mockOAuth2User.getName()).thenReturn("github123");

        SignatureNotFromUserException exception = new SignatureNotFromUserException(1L, "github123");
        when(signatureService.getSignature(eq(OAuthProvider.GITHUB), eq("github123"), eq(1L)))
                .thenThrow(exception);

        // When & Then
        SignatureNotFromUserException thrownException = assertThrows(SignatureNotFromUserException.class,
                () -> signatureController.getSignatureById(mockAuthentication, 1L));

        assertTrue(thrownException.getMessage().contains("does not belong to a model property of user: github123"));

        verify(signatureService).getSignature(eq(OAuthProvider.GITHUB), eq("github123"), eq(1L));
    }

    // Tests for exception handlers

    @Test
    void handleSignatureAlreadyExistsException_ReturnsConflict() {
        // Given
        SignatureAlreadyExistsException exception = new SignatureAlreadyExistsException(1L, testInputSignature);
        when(mockRequest.getRequestURI()).thenReturn("/api/signature/create");

        // When
        ResponseEntity<ErrorDto> response = signatureController.handleSignatureAlreadyExistsException(exception,
                mockRequest);

        // Then
        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertNotNull(response.getBody());

        ErrorDto errorDto = response.getBody();
        assertNotNull(errorDto);
        assertEquals(409, errorDto.status());
        assertTrue(errorDto.message().contains("already exists for model ID: 1"));
        assertEquals("/api/signature/create", errorDto.path());
        assertNotNull(errorDto.timestamp());
    }

    @Test
    void handleSignatureDoesNotExistsException_ReturnsNotFound() {
        // Given
        SignatureDoesNotExistsException exception = new SignatureDoesNotExistsException(999L);
        when(mockRequest.getRequestURI()).thenReturn("/api/signature/999");

        // When
        ResponseEntity<ErrorDto> response = signatureController.handleSignatureDoesNotExistsException(exception,
                mockRequest);

        // Then
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertNotNull(response.getBody());

        ErrorDto errorDto = response.getBody();
        assertNotNull(errorDto);
        assertEquals(404, errorDto.status());
        assertEquals("Signature with ID '999' does not exist.", errorDto.message());
        assertEquals("/api/signature/999", errorDto.path());
        assertNotNull(errorDto.timestamp());
    }

    @Test
    void handleSignatureNotFromUserException_ReturnsForbidden() {
        // Given
        SignatureNotFromUserException exception = new SignatureNotFromUserException(1L, "github123");
        when(mockRequest.getRequestURI()).thenReturn("/api/signature/1");

        // When
        ResponseEntity<ErrorDto> response = signatureController.handleSignatureNotFromUserException(exception,
                mockRequest);

        // Then
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertNotNull(response.getBody());

        ErrorDto errorDto = response.getBody();
        assertNotNull(errorDto);
        assertEquals(403, errorDto.status());
        assertTrue(errorDto.message().contains("does not belong to a model property of user: github123"));
        assertEquals("/api/signature/1", errorDto.path());
        assertNotNull(errorDto.timestamp());
    }

    @Test
    void handleSignatureNotSemVerException_ReturnsPreconditionFailed() {
        // Given
        SignatureNotSemVerException exception = new SignatureNotSemVerException("Invalid Name");
        when(mockRequest.getRequestURI()).thenReturn("/api/signature/create");

        // When
        ResponseEntity<ErrorDto> response = signatureController.handleSignatureNotSemVerException(exception,
                mockRequest);

        // Then
        assertEquals(HttpStatus.PRECONDITION_FAILED, response.getStatusCode());
        assertNotNull(response.getBody());

        ErrorDto errorDto = response.getBody();
        assertNotNull(errorDto);
        assertEquals(412, errorDto.status());
        assertTrue(errorDto.message().contains("Cannot create signature with name 'Invalid Name'"));
        assertTrue(errorDto.message().contains("not a valid semantic versioning"));
        assertEquals("/api/signature/create", errorDto.path());
        assertNotNull(errorDto.timestamp());
    }

    @Test
    void createSignature_DifferentVersions() {
        // Given
        when(mockAuthentication.getAuthorizedClientRegistrationId()).thenReturn("github");
        when(mockAuthentication.getPrincipal()).thenReturn(mockOAuth2User);
        when(mockOAuth2User.getName()).thenReturn("github123");

        int[][] versions = { { 0, 1, 0 }, { 2, 0, 0 }, { 1, 5, 3 } };

        for (int[] version : versions) {
            testCreateParams.setMajor(version[0]);
            testCreateParams.setMinor(version[1]);
            testCreateParams.setPatch(version[2]);

            testSignature.setMajor(version[0]);
            testSignature.setMinor(version[1]);
            testSignature.setPatch(version[2]);

            when(signatureService.createSignature(
                    eq(OAuthProvider.GITHUB), eq("github123"), eq(1L), eq(testInputSignature),
                    eq("Test Signature"), eq(version[0]), eq(version[1]), eq(version[2]), isNull()))
                    .thenReturn(testSignature);

            // When
            ResponseEntity<SignatureDto> response = signatureController.createSignature(mockAuthentication,
                    testCreateParams);

            // Then
            assertEquals(HttpStatus.CREATED, response.getStatusCode());
            assertNotNull(response.getBody());

            SignatureDto signatureDto = response.getBody();
            assertNotNull(signatureDto);
            assertEquals(version[0], signatureDto.getMajor());
            assertEquals(version[1], signatureDto.getMinor());
            assertEquals(version[2], signatureDto.getPatch());

            verify(signatureService).createSignature(
                    eq(OAuthProvider.GITHUB), eq("github123"), eq(1L), eq(testInputSignature),
                    eq("Test Signature"), eq(version[0]), eq(version[1]), eq(version[2]), isNull());
        }
    }

    @Test
    void getAllSignatures_DifferentModelIds() {
        // Given
        when(mockAuthentication.getAuthorizedClientRegistrationId()).thenReturn("github");
        when(mockAuthentication.getPrincipal()).thenReturn(mockOAuth2User);
        when(mockOAuth2User.getName()).thenReturn("github123");

        Long[] modelIds = { 1L, 5L, 100L };

        for (Long modelId : modelIds) {
            when(signatureService.getSignatureByModelId(eq(OAuthProvider.GITHUB), eq("github123"), eq(modelId)))
                    .thenReturn(Arrays.asList(testSignature));

            // When
            ResponseEntity<List<SignatureDto>> response = signatureController.getAllSignatures(mockAuthentication,
                    modelId);

            // Then
            assertEquals(HttpStatus.OK, response.getStatusCode());
            assertNotNull(response.getBody());

            List<SignatureDto> signatureDtos = response.getBody();
            assertNotNull(signatureDtos);
            assertEquals(1, signatureDtos.size());

            verify(signatureService).getSignatureByModelId(eq(OAuthProvider.GITHUB), eq("github123"), eq(modelId));
        }
    }
}
