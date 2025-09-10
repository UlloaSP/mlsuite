package dev.ulloasp.mlsuite.signature;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import dev.ulloasp.mlsuite.model.entities.Model;
import dev.ulloasp.mlsuite.model.exceptions.ModelDoesNotExistsException;
import dev.ulloasp.mlsuite.model.exceptions.ModelNotFromUserException;
import dev.ulloasp.mlsuite.model.repositories.ModelRepository;
import dev.ulloasp.mlsuite.signature.entities.Signature;
import dev.ulloasp.mlsuite.signature.exceptions.SignatureAlreadyExistsException;
import dev.ulloasp.mlsuite.signature.exceptions.SignatureDoesNotExistsException;
import dev.ulloasp.mlsuite.signature.exceptions.SignatureNotFromUserException;
import dev.ulloasp.mlsuite.signature.exceptions.SignatureNotSemVerException;
import dev.ulloasp.mlsuite.signature.repositories.SignatureRepository;
import dev.ulloasp.mlsuite.signature.services.SignatureServiceImpl;
import dev.ulloasp.mlsuite.user.entity.OAuthProvider;
import dev.ulloasp.mlsuite.user.entity.User;
import dev.ulloasp.mlsuite.user.exceptions.UserDoesNotExistException;
import dev.ulloasp.mlsuite.user.repository.UserRepository;

@ExtendWith(MockitoExtension.class)
public class SignatureServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private SignatureRepository signatureRepository;

    @Mock
    private ModelRepository modelRepository;

    private SignatureServiceImpl signatureService;

    // Test data constants
    private final OAuthProvider oauthProvider = OAuthProvider.GITHUB;
    private final String oauthId = "12345";
    private final String username = "testuser";
    private final Long modelId = 1L;
    private final Long signatureId = 10L;
    private final String signatureName = "test-signature";
    private final int major = 1;
    private final int minor = 0;
    private final int patch = 0;

    private User testUser;
    private Model testModel;
    private Signature testSignature;
    private Map<String, Object> inputSignature;

    @BeforeEach
    void setUp() {
        signatureService = new SignatureServiceImpl(userRepository, signatureRepository, modelRepository);

        // Setup test user
        testUser = new User();
        testUser.setId(1L);
        testUser.setUsername(username);
        testUser.setOauthProvider(oauthProvider);
        testUser.setOauthId(oauthId);

        // Setup test model
        testModel = new Model();
        testModel.setId(modelId);
        testModel.setUser(testUser);
        testModel.setName("test-model");
        testModel.setType("classifier");

        // Setup input signature
        inputSignature = new HashMap<>();
        inputSignature.put("feature1", "string");
        inputSignature.put("feature2", "numeric");

        // Setup test signature
        testSignature = new Signature();
        testSignature.setId(signatureId);
        testSignature.setModel(testModel);
        testSignature.setName(signatureName);
        testSignature.setMajor(major);
        testSignature.setMinor(minor);
        testSignature.setPatch(patch);
        testSignature.setInputSignature(inputSignature);
    }

    // ===============================
    // CREATE SIGNATURE TESTS
    // ===============================

    @Test
    void createSignature_Success() {
        // Given
        when(userRepository.findByOauthProviderAndOauthId(oauthProvider, oauthId))
                .thenReturn(Optional.of(testUser));
        when(modelRepository.findByIdAndUserId(modelId, testUser.getId()))
                .thenReturn(Optional.of(testModel));
        when(signatureRepository.existsByModelIdAndInputSignature(modelId, inputSignature))
                .thenReturn(false);
        when(signatureRepository.existsByModelIdAndMajorAndMinorAndPatch(modelId, major, minor, patch))
                .thenReturn(false);
        when(signatureRepository.save(any(Signature.class))).thenReturn(testSignature);

        // When
        Signature result = signatureService.createSignature(oauthProvider, oauthId, modelId,
                inputSignature, signatureName, major, minor, patch, null);

        // Then
        assertNotNull(result);
        assertEquals(testSignature.getId(), result.getId());
        assertEquals(testSignature.getName(), result.getName());
        assertEquals(testSignature.getMajor(), result.getMajor());
        assertEquals(testSignature.getMinor(), result.getMinor());
        assertEquals(testSignature.getPatch(), result.getPatch());

        verify(userRepository).findByOauthProviderAndOauthId(oauthProvider, oauthId);
        verify(modelRepository).findByIdAndUserId(modelId, testUser.getId());
        verify(signatureRepository).existsByModelIdAndInputSignature(modelId, inputSignature);
        verify(signatureRepository).existsByModelIdAndMajorAndMinorAndPatch(modelId, major, minor, patch);
        verify(signatureRepository).save(any(Signature.class));
    }

    @Test
    void createSignature_WithOrigin_Success() {
        // Given
        Long originId = 5L;
        Signature originSignature = new Signature();
        originSignature.setId(originId);

        when(userRepository.findByOauthProviderAndOauthId(oauthProvider, oauthId))
                .thenReturn(Optional.of(testUser));
        when(modelRepository.findByIdAndUserId(modelId, testUser.getId()))
                .thenReturn(Optional.of(testModel));
        when(signatureRepository.existsByModelIdAndInputSignature(modelId, inputSignature))
                .thenReturn(false);
        when(signatureRepository.existsByModelIdAndMajorAndMinorAndPatch(modelId, major, minor, patch))
                .thenReturn(false);
        when(signatureRepository.findById(originId)).thenReturn(Optional.of(originSignature));
        when(signatureRepository.save(any(Signature.class))).thenReturn(testSignature);

        // When
        Signature result = signatureService.createSignature(oauthProvider, oauthId, modelId,
                inputSignature, signatureName, major, minor, patch, originId);

        // Then
        assertNotNull(result);
        verify(signatureRepository).findById(originId);
        verify(signatureRepository).save(
                argThat(signature -> signature.getOrigin() != null && signature.getOrigin().getId().equals(originId)));
    }

    @Test
    void createSignature_UserDoesNotExist_ThrowsException() {
        // Given
        when(userRepository.findByOauthProviderAndOauthId(oauthProvider, oauthId))
                .thenReturn(Optional.empty());

        // When & Then
        UserDoesNotExistException exception = assertThrows(
                UserDoesNotExistException.class,
                () -> signatureService.createSignature(oauthProvider, oauthId, modelId,
                        inputSignature, signatureName, major, minor, patch, null));

        assertTrue(exception.getMessage().contains(oauthProvider.toString()));
        assertTrue(exception.getMessage().contains(oauthId));

        verify(userRepository).findByOauthProviderAndOauthId(oauthProvider, oauthId);
        verifyNoInteractions(modelRepository);
        verifyNoInteractions(signatureRepository);
    }

    @Test
    void createSignature_ModelDoesNotExist_ThrowsException() {
        // Given
        when(userRepository.findByOauthProviderAndOauthId(oauthProvider, oauthId))
                .thenReturn(Optional.of(testUser));
        when(modelRepository.findByIdAndUserId(modelId, testUser.getId()))
                .thenReturn(Optional.empty());

        // When & Then
        ModelDoesNotExistsException exception = assertThrows(
                ModelDoesNotExistsException.class,
                () -> signatureService.createSignature(oauthProvider, oauthId, modelId,
                        inputSignature, signatureName, major, minor, patch, null));

        assertTrue(exception.getMessage().contains(modelId.toString()));
        assertTrue(exception.getMessage().contains(username));

        verify(userRepository).findByOauthProviderAndOauthId(oauthProvider, oauthId);
        verify(modelRepository).findByIdAndUserId(modelId, testUser.getId());
        verifyNoMoreInteractions(signatureRepository);
    }

    @Test
    void createSignature_SignatureAlreadyExistsByInputSignature_ThrowsException() {
        // Given
        when(userRepository.findByOauthProviderAndOauthId(oauthProvider, oauthId))
                .thenReturn(Optional.of(testUser));
        when(modelRepository.findByIdAndUserId(modelId, testUser.getId()))
                .thenReturn(Optional.of(testModel));
        when(signatureRepository.existsByModelIdAndInputSignature(modelId, inputSignature))
                .thenReturn(true);

        // When & Then
        SignatureAlreadyExistsException exception = assertThrows(
                SignatureAlreadyExistsException.class,
                () -> signatureService.createSignature(oauthProvider, oauthId, modelId,
                        inputSignature, signatureName, major, minor, patch, null));

        assertTrue(exception.getMessage().contains(modelId.toString()));
        assertTrue(exception.getMessage().contains("input"));

        verify(signatureRepository).existsByModelIdAndInputSignature(modelId, inputSignature);
        verify(signatureRepository, never()).save(any());
    }

    @Test
    void createSignature_SignatureAlreadyExistsByVersion_ThrowsException() {
        // Given
        when(userRepository.findByOauthProviderAndOauthId(oauthProvider, oauthId))
                .thenReturn(Optional.of(testUser));
        when(modelRepository.findByIdAndUserId(modelId, testUser.getId()))
                .thenReturn(Optional.of(testModel));
        when(signatureRepository.existsByModelIdAndInputSignature(modelId, inputSignature))
                .thenReturn(false);
        when(signatureRepository.existsByModelIdAndMajorAndMinorAndPatch(modelId, major, minor, patch))
                .thenReturn(true);

        // When & Then
        SignatureAlreadyExistsException exception = assertThrows(
                SignatureAlreadyExistsException.class,
                () -> signatureService.createSignature(oauthProvider, oauthId, modelId,
                        inputSignature, signatureName, major, minor, patch, null));

        assertTrue(exception.getMessage().contains(modelId.toString()));
        assertTrue(exception.getMessage().contains("version"));
        assertTrue(exception.getMessage().contains(major + "." + minor + "." + patch));

        verify(signatureRepository).existsByModelIdAndMajorAndMinorAndPatch(modelId, major, minor, patch);
        verify(signatureRepository, never()).save(any());
    }

    @Test
    void createSignature_InvalidSemVer_NegativeMajor_ThrowsException() {
        // Given
        int invalidMajor = -1;
        when(userRepository.findByOauthProviderAndOauthId(oauthProvider, oauthId))
                .thenReturn(Optional.of(testUser));
        when(modelRepository.findByIdAndUserId(modelId, testUser.getId()))
                .thenReturn(Optional.of(testModel));
        when(signatureRepository.existsByModelIdAndInputSignature(modelId, inputSignature))
                .thenReturn(false);
        when(signatureRepository.existsByModelIdAndMajorAndMinorAndPatch(modelId, invalidMajor, minor, patch))
                .thenReturn(false);

        // When & Then
        SignatureNotSemVerException exception = assertThrows(
                SignatureNotSemVerException.class,
                () -> signatureService.createSignature(oauthProvider, oauthId, modelId,
                        inputSignature, signatureName, invalidMajor, minor, patch, null));

        assertTrue(exception.getMessage().contains(signatureName));
        assertTrue(exception.getMessage().contains("semantic versioning"));

        verify(signatureRepository, never()).save(any());
    }

    @Test
    void createSignature_InvalidSemVer_NegativeMinor_ThrowsException() {
        // Given
        int invalidMinor = -1;
        when(userRepository.findByOauthProviderAndOauthId(oauthProvider, oauthId))
                .thenReturn(Optional.of(testUser));
        when(modelRepository.findByIdAndUserId(modelId, testUser.getId()))
                .thenReturn(Optional.of(testModel));
        when(signatureRepository.existsByModelIdAndInputSignature(modelId, inputSignature))
                .thenReturn(false);
        when(signatureRepository.existsByModelIdAndMajorAndMinorAndPatch(modelId, major, invalidMinor, patch))
                .thenReturn(false);

        // When & Then
        SignatureNotSemVerException exception = assertThrows(
                SignatureNotSemVerException.class,
                () -> signatureService.createSignature(oauthProvider, oauthId, modelId,
                        inputSignature, signatureName, major, invalidMinor, patch, null));

        assertTrue(exception.getMessage().contains(signatureName));
        verify(signatureRepository, never()).save(any());
    }

    @Test
    void createSignature_InvalidSemVer_NegativePatch_ThrowsException() {
        // Given
        int invalidPatch = -1;
        when(userRepository.findByOauthProviderAndOauthId(oauthProvider, oauthId))
                .thenReturn(Optional.of(testUser));
        when(modelRepository.findByIdAndUserId(modelId, testUser.getId()))
                .thenReturn(Optional.of(testModel));
        when(signatureRepository.existsByModelIdAndInputSignature(modelId, inputSignature))
                .thenReturn(false);
        when(signatureRepository.existsByModelIdAndMajorAndMinorAndPatch(modelId, major, minor, invalidPatch))
                .thenReturn(false);

        // When & Then
        SignatureNotSemVerException exception = assertThrows(
                SignatureNotSemVerException.class,
                () -> signatureService.createSignature(oauthProvider, oauthId, modelId,
                        inputSignature, signatureName, major, minor, invalidPatch, null));

        assertTrue(exception.getMessage().contains(signatureName));
        verify(signatureRepository, never()).save(any());
    }

    @Test
    void createSignature_OriginDoesNotExist_ThrowsException() {
        // Given
        Long nonExistentOriginId = 999L;
        when(userRepository.findByOauthProviderAndOauthId(oauthProvider, oauthId))
                .thenReturn(Optional.of(testUser));
        when(modelRepository.findByIdAndUserId(modelId, testUser.getId()))
                .thenReturn(Optional.of(testModel));
        when(signatureRepository.existsByModelIdAndInputSignature(modelId, inputSignature))
                .thenReturn(false);
        when(signatureRepository.existsByModelIdAndMajorAndMinorAndPatch(modelId, major, minor, patch))
                .thenReturn(false);
        when(signatureRepository.findById(nonExistentOriginId)).thenReturn(Optional.empty());

        // When & Then
        SignatureDoesNotExistsException exception = assertThrows(
                SignatureDoesNotExistsException.class,
                () -> signatureService.createSignature(oauthProvider, oauthId, modelId,
                        inputSignature, signatureName, major, minor, patch, nonExistentOriginId));

        assertTrue(exception.getMessage().contains(nonExistentOriginId.toString()));

        verify(signatureRepository).findById(nonExistentOriginId);
        verify(signatureRepository, never()).save(any());
    }

    // ===============================
    // GET SIGNATURE TESTS
    // ===============================

    @Test
    void getSignature_Success() {
        // Given
        when(userRepository.findByOauthProviderAndOauthId(oauthProvider, oauthId))
                .thenReturn(Optional.of(testUser));
        when(signatureRepository.findById(signatureId))
                .thenReturn(Optional.of(testSignature));

        // When
        Signature result = signatureService.getSignature(oauthProvider, oauthId, signatureId);

        // Then
        assertNotNull(result);
        assertEquals(testSignature.getId(), result.getId());
        assertEquals(testSignature.getName(), result.getName());
        assertEquals(testSignature.getModel().getId(), result.getModel().getId());

        verify(userRepository).findByOauthProviderAndOauthId(oauthProvider, oauthId);
        verify(signatureRepository).findById(signatureId);
    }

    @Test
    void getSignature_UserDoesNotExist_ThrowsException() {
        // Given
        when(userRepository.findByOauthProviderAndOauthId(oauthProvider, oauthId))
                .thenReturn(Optional.empty());

        // When & Then
        UserDoesNotExistException exception = assertThrows(
                UserDoesNotExistException.class,
                () -> signatureService.getSignature(oauthProvider, oauthId, signatureId));

        assertTrue(exception.getMessage().contains(oauthProvider.toString()));
        assertTrue(exception.getMessage().contains(oauthId));

        verify(userRepository).findByOauthProviderAndOauthId(oauthProvider, oauthId);
        verifyNoInteractions(signatureRepository);
    }

    @Test
    void getSignature_SignatureDoesNotExist_ThrowsException() {
        // Given
        when(userRepository.findByOauthProviderAndOauthId(oauthProvider, oauthId))
                .thenReturn(Optional.of(testUser));
        when(signatureRepository.findById(signatureId))
                .thenReturn(Optional.empty());

        // When & Then
        SignatureDoesNotExistsException exception = assertThrows(
                SignatureDoesNotExistsException.class,
                () -> signatureService.getSignature(oauthProvider, oauthId, signatureId));

        assertTrue(exception.getMessage().contains(signatureId.toString()));

        verify(userRepository).findByOauthProviderAndOauthId(oauthProvider, oauthId);
        verify(signatureRepository).findById(signatureId);
    }

    @Test
    void getSignature_SignatureNotFromUser_ThrowsException() {
        // Given
        User otherUser = new User();
        otherUser.setId(2L);
        otherUser.setUsername("otheruser");

        Model otherModel = new Model();
        otherModel.setId(2L);
        otherModel.setUser(otherUser);

        Signature otherSignature = new Signature();
        otherSignature.setId(signatureId);
        otherSignature.setModel(otherModel);

        when(userRepository.findByOauthProviderAndOauthId(oauthProvider, oauthId))
                .thenReturn(Optional.of(testUser));
        when(signatureRepository.findById(signatureId))
                .thenReturn(Optional.of(otherSignature));

        // When & Then
        SignatureNotFromUserException exception = assertThrows(
                SignatureNotFromUserException.class,
                () -> signatureService.getSignature(oauthProvider, oauthId, signatureId));

        assertTrue(exception.getMessage().contains(signatureId.toString()));
        assertTrue(exception.getMessage().contains(username));

        verify(userRepository).findByOauthProviderAndOauthId(oauthProvider, oauthId);
        verify(signatureRepository).findById(signatureId);
    }

    // ===============================
    // GET SIGNATURES BY MODEL ID TESTS
    // ===============================

    @Test
    void getSignatureByModelId_Success() {
        // Given
        Signature signature2 = new Signature();
        signature2.setId(11L);
        signature2.setModel(testModel);
        signature2.setName("signature2");

        List<Signature> expectedSignatures = Arrays.asList(testSignature, signature2);

        when(userRepository.findByOauthProviderAndOauthId(oauthProvider, oauthId))
                .thenReturn(Optional.of(testUser));
        when(modelRepository.findById(modelId))
                .thenReturn(Optional.of(testModel));
        when(signatureRepository.findByModelId(modelId))
                .thenReturn(expectedSignatures);

        // When
        List<Signature> result = signatureService.getSignatureByModelId(oauthProvider, oauthId, modelId);

        // Then
        assertNotNull(result);
        assertEquals(2, result.size());
        assertEquals(expectedSignatures, result);

        verify(userRepository).findByOauthProviderAndOauthId(oauthProvider, oauthId);
        verify(modelRepository).findById(modelId);
        verify(signatureRepository).findByModelId(modelId);
    }

    @Test
    void getSignatureByModelId_EmptyList_Success() {
        // Given
        when(userRepository.findByOauthProviderAndOauthId(oauthProvider, oauthId))
                .thenReturn(Optional.of(testUser));
        when(modelRepository.findById(modelId))
                .thenReturn(Optional.of(testModel));
        when(signatureRepository.findByModelId(modelId))
                .thenReturn(Arrays.asList());

        // When
        List<Signature> result = signatureService.getSignatureByModelId(oauthProvider, oauthId, modelId);

        // Then
        assertNotNull(result);
        assertTrue(result.isEmpty());

        verify(userRepository).findByOauthProviderAndOauthId(oauthProvider, oauthId);
        verify(modelRepository).findById(modelId);
        verify(signatureRepository).findByModelId(modelId);
    }

    @Test
    void getSignatureByModelId_UserDoesNotExist_ThrowsException() {
        // Given
        when(userRepository.findByOauthProviderAndOauthId(oauthProvider, oauthId))
                .thenReturn(Optional.empty());

        // When & Then
        UserDoesNotExistException exception = assertThrows(
                UserDoesNotExistException.class,
                () -> signatureService.getSignatureByModelId(oauthProvider, oauthId, modelId));

        assertTrue(exception.getMessage().contains(oauthProvider.toString()));
        assertTrue(exception.getMessage().contains(oauthId));

        verify(userRepository).findByOauthProviderAndOauthId(oauthProvider, oauthId);
        verifyNoInteractions(modelRepository);
        verifyNoInteractions(signatureRepository);
    }

    @Test
    void getSignatureByModelId_ModelDoesNotExist_ThrowsException() {
        // Given
        when(userRepository.findByOauthProviderAndOauthId(oauthProvider, oauthId))
                .thenReturn(Optional.of(testUser));
        when(modelRepository.findById(modelId))
                .thenReturn(Optional.empty());

        // When & Then
        ModelDoesNotExistsException exception = assertThrows(
                ModelDoesNotExistsException.class,
                () -> signatureService.getSignatureByModelId(oauthProvider, oauthId, modelId));

        assertTrue(exception.getMessage().contains(modelId.toString()));
        assertTrue(exception.getMessage().contains(username));

        verify(userRepository).findByOauthProviderAndOauthId(oauthProvider, oauthId);
        verify(modelRepository).findById(modelId);
        verifyNoInteractions(signatureRepository);
    }

    @Test
    void getSignatureByModelId_ModelNotFromUser_ThrowsException() {
        // Given
        User otherUser = new User();
        otherUser.setId(2L);
        otherUser.setUsername("otheruser");

        Model otherModel = new Model();
        otherModel.setId(modelId);
        otherModel.setName("other-model");
        otherModel.setUser(otherUser);

        when(userRepository.findByOauthProviderAndOauthId(oauthProvider, oauthId))
                .thenReturn(Optional.of(testUser));
        when(modelRepository.findById(modelId))
                .thenReturn(Optional.of(otherModel));

        // When & Then
        ModelNotFromUserException exception = assertThrows(
                ModelNotFromUserException.class,
                () -> signatureService.getSignatureByModelId(oauthProvider, oauthId, modelId));

        assertTrue(exception.getMessage().contains(modelId.toString()));
        assertTrue(exception.getMessage().contains(otherModel.getName()));
        assertTrue(exception.getMessage().contains(username));

        verify(userRepository).findByOauthProviderAndOauthId(oauthProvider, oauthId);
        verify(modelRepository).findById(modelId);
        verifyNoInteractions(signatureRepository);
    }

    // ===============================
    // EDGE CASE TESTS
    // ===============================

    @Test
    void createSignature_WithZeroVersions_Success() {
        // Given
        int zeroMajor = 0, zeroMinor = 0, zeroPatch = 0;
        when(userRepository.findByOauthProviderAndOauthId(oauthProvider, oauthId))
                .thenReturn(Optional.of(testUser));
        when(modelRepository.findByIdAndUserId(modelId, testUser.getId()))
                .thenReturn(Optional.of(testModel));
        when(signatureRepository.existsByModelIdAndInputSignature(modelId, inputSignature))
                .thenReturn(false);
        when(signatureRepository.existsByModelIdAndMajorAndMinorAndPatch(modelId, zeroMajor, zeroMinor, zeroPatch))
                .thenReturn(false);
        when(signatureRepository.save(any(Signature.class))).thenReturn(testSignature);

        // When
        Signature result = signatureService.createSignature(oauthProvider, oauthId, modelId,
                inputSignature, signatureName, zeroMajor, zeroMinor, zeroPatch, null);

        // Then
        assertNotNull(result);
        verify(signatureRepository).save(any(Signature.class));
    }

    @Test
    void createSignature_WithHighVersionNumbers_Success() {
        // Given
        int highMajor = 999, highMinor = 888, highPatch = 777;
        when(userRepository.findByOauthProviderAndOauthId(oauthProvider, oauthId))
                .thenReturn(Optional.of(testUser));
        when(modelRepository.findByIdAndUserId(modelId, testUser.getId()))
                .thenReturn(Optional.of(testModel));
        when(signatureRepository.existsByModelIdAndInputSignature(modelId, inputSignature))
                .thenReturn(false);
        when(signatureRepository.existsByModelIdAndMajorAndMinorAndPatch(modelId, highMajor, highMinor, highPatch))
                .thenReturn(false);
        when(signatureRepository.save(any(Signature.class))).thenReturn(testSignature);

        // When
        Signature result = signatureService.createSignature(oauthProvider, oauthId, modelId,
                inputSignature, signatureName, highMajor, highMinor, highPatch, null);

        // Then
        assertNotNull(result);
        verify(signatureRepository).save(any(Signature.class));
    }

    @Test
    void createSignature_WithComplexInputSignature_Success() {
        // Given
        Map<String, Object> complexInputSignature = new HashMap<>();
        complexInputSignature.put("feature1", "string");
        complexInputSignature.put("feature2", "numeric");
        complexInputSignature.put("feature3", Arrays.asList("category1", "category2"));
        complexInputSignature.put("nested", Map.of("subfeature", "boolean"));

        when(userRepository.findByOauthProviderAndOauthId(oauthProvider, oauthId))
                .thenReturn(Optional.of(testUser));
        when(modelRepository.findByIdAndUserId(modelId, testUser.getId()))
                .thenReturn(Optional.of(testModel));
        when(signatureRepository.existsByModelIdAndInputSignature(modelId, complexInputSignature))
                .thenReturn(false);
        when(signatureRepository.existsByModelIdAndMajorAndMinorAndPatch(modelId, major, minor, patch))
                .thenReturn(false);
        when(signatureRepository.save(any(Signature.class))).thenReturn(testSignature);

        // When
        Signature result = signatureService.createSignature(oauthProvider, oauthId, modelId,
                complexInputSignature, signatureName, major, minor, patch, null);

        // Then
        assertNotNull(result);
        verify(signatureRepository).existsByModelIdAndInputSignature(modelId, complexInputSignature);
        verify(signatureRepository).save(any(Signature.class));
    }
}
