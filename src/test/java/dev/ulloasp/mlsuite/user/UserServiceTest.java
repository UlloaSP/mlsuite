package dev.ulloasp.mlsuite.user;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import dev.ulloasp.mlsuite.user.entity.OAuthProvider;
import dev.ulloasp.mlsuite.user.entity.User;
import dev.ulloasp.mlsuite.user.exceptions.UserAlreadyExistsException;
import dev.ulloasp.mlsuite.user.exceptions.UserDoesNotExistException;
import dev.ulloasp.mlsuite.user.repository.UserRepository;
import dev.ulloasp.mlsuite.user.service.UserServiceImpl;

@ExtendWith(MockitoExtension.class)
public class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    private UserServiceImpl userService;

    // Test data constants
    private final String username = "testuser";
    private final String email = "test@example.com";
    private final OAuthProvider oauthProvider = OAuthProvider.GITHUB;
    private final String oauthId = "12345";
    private final String avatarUrl = "https://avatar.example.com/testuser.jpg";
    private final String fullName = "Test User";

    private User testUser;

    @BeforeEach
    void setUp() {
        userService = new UserServiceImpl(userRepository);

        testUser = new User();
        testUser.setId(1L);
        testUser.setUsername(username);
        testUser.setEmail(email);
        testUser.setOauthProvider(oauthProvider);
        testUser.setOauthId(oauthId);
        testUser.setAvatarUrl(avatarUrl);
        testUser.setFullName(fullName);
    }

    // ===============================
    // SIGN UP TESTS
    // ===============================

    @Test
    void signUp_Success() {
        // Given
        when(userRepository.existsByOauthProviderAndOauthId(oauthProvider, oauthId)).thenReturn(false);
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        // When
        assertDoesNotThrow(() -> userService.signUp(username, email, oauthProvider, oauthId, avatarUrl, fullName));

        // Then
        verify(userRepository).existsByOauthProviderAndOauthId(oauthProvider, oauthId);
        verify(userRepository).save(argThat(user -> username.equals(user.getUsername()) &&
                email.equals(user.getEmail()) &&
                oauthProvider.equals(user.getOauthProvider()) &&
                oauthId.equals(user.getOauthId()) &&
                avatarUrl.equals(user.getAvatarUrl()) &&
                fullName.equals(user.getFullName())));
    }

    @Test
    void signUp_UserAlreadyExists_ThrowsException() {
        // Given
        when(userRepository.existsByOauthProviderAndOauthId(oauthProvider, oauthId)).thenReturn(true);

        // When & Then
        UserAlreadyExistsException exception = assertThrows(
                UserAlreadyExistsException.class,
                () -> userService.signUp(username, email, oauthProvider, oauthId, avatarUrl, fullName));

        assertTrue(exception.getMessage().contains(oauthProvider.toString()));
        assertTrue(exception.getMessage().contains(oauthId));
        assertTrue(exception.getMessage().contains("already exists"));

        verify(userRepository).existsByOauthProviderAndOauthId(oauthProvider, oauthId);
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void signUp_WithNullAvatarUrl_Success() {
        // Given
        String nullAvatarUrl = null;
        when(userRepository.existsByOauthProviderAndOauthId(oauthProvider, oauthId)).thenReturn(false);
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        // When
        assertDoesNotThrow(() -> userService.signUp(username, email, oauthProvider, oauthId, nullAvatarUrl, fullName));

        // Then
        verify(userRepository).existsByOauthProviderAndOauthId(oauthProvider, oauthId);
        verify(userRepository).save(argThat(user -> username.equals(user.getUsername()) &&
                email.equals(user.getEmail()) &&
                oauthProvider.equals(user.getOauthProvider()) &&
                oauthId.equals(user.getOauthId()) &&
                nullAvatarUrl == user.getAvatarUrl() &&
                fullName.equals(user.getFullName())));
    }

    @Test
    void signUp_WithDifferentOAuthProviders_Success() {
        // Given - Test with Google provider
        OAuthProvider googleProvider = OAuthProvider.GOOGLE;
        when(userRepository.existsByOauthProviderAndOauthId(googleProvider, oauthId)).thenReturn(false);
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        // When
        assertDoesNotThrow(() -> userService.signUp(username, email, googleProvider, oauthId, avatarUrl, fullName));

        // Then
        verify(userRepository).existsByOauthProviderAndOauthId(googleProvider, oauthId);
        verify(userRepository).save(argThat(user -> googleProvider.equals(user.getOauthProvider())));
    }

    // ===============================
    // SIGN IN TESTS
    // ===============================

    @Test
    void signIn_Success() {
        // Given
        when(userRepository.existsByOauthProviderAndOauthId(oauthProvider, oauthId)).thenReturn(true);

        // When
        assertDoesNotThrow(() -> userService.signIn(oauthProvider, oauthId));

        // Then
        verify(userRepository).existsByOauthProviderAndOauthId(oauthProvider, oauthId);
    }

    @Test
    void signIn_UserDoesNotExist_ThrowsException() {
        // Given
        when(userRepository.existsByOauthProviderAndOauthId(oauthProvider, oauthId)).thenReturn(false);

        // When & Then
        UserDoesNotExistException exception = assertThrows(
                UserDoesNotExistException.class,
                () -> userService.signIn(oauthProvider, oauthId));

        assertTrue(exception.getMessage().contains(oauthProvider.toString()));
        assertTrue(exception.getMessage().contains(oauthId));
        assertTrue(exception.getMessage().contains("does not exist"));

        verify(userRepository).existsByOauthProviderAndOauthId(oauthProvider, oauthId);
    }

    @Test
    void signIn_WithDifferentOAuthProviders_Success() {
        // Given - Test with System provider
        OAuthProvider systemProvider = OAuthProvider.SYSTEM;
        String systemOauthId = "system123";
        when(userRepository.existsByOauthProviderAndOauthId(systemProvider, systemOauthId)).thenReturn(true);

        // When
        assertDoesNotThrow(() -> userService.signIn(systemProvider, systemOauthId));

        // Then
        verify(userRepository).existsByOauthProviderAndOauthId(systemProvider, systemOauthId);
    }

    @Test
    void signIn_WithNonExistentUserDifferentProvider_ThrowsException() {
        // Given - Test with Google provider that doesn't exist
        OAuthProvider googleProvider = OAuthProvider.GOOGLE;
        String googleOauthId = "google123";
        when(userRepository.existsByOauthProviderAndOauthId(googleProvider, googleOauthId)).thenReturn(false);

        // When & Then
        UserDoesNotExistException exception = assertThrows(
                UserDoesNotExistException.class,
                () -> userService.signIn(googleProvider, googleOauthId));

        assertTrue(exception.getMessage().contains(googleProvider.toString()));
        assertTrue(exception.getMessage().contains(googleOauthId));

        verify(userRepository).existsByOauthProviderAndOauthId(googleProvider, googleOauthId);
    }

    // ===============================
    // GET PROFILE TESTS
    // ===============================

    @Test
    void getProfile_Success() {
        // Given
        when(userRepository.findByOauthProviderAndOauthId(oauthProvider, oauthId)).thenReturn(Optional.of(testUser));

        // When
        User result = userService.getProfile(oauthId, oauthProvider);

        // Then
        assertNotNull(result);
        assertEquals(testUser.getId(), result.getId());
        assertEquals(testUser.getUsername(), result.getUsername());
        assertEquals(testUser.getEmail(), result.getEmail());
        assertEquals(testUser.getOauthProvider(), result.getOauthProvider());
        assertEquals(testUser.getOauthId(), result.getOauthId());
        assertEquals(testUser.getAvatarUrl(), result.getAvatarUrl());
        assertEquals(testUser.getFullName(), result.getFullName());

        verify(userRepository).findByOauthProviderAndOauthId(oauthProvider, oauthId);
    }

    @Test
    void getProfile_UserDoesNotExist_ThrowsException() {
        // Given
        when(userRepository.findByOauthProviderAndOauthId(oauthProvider, oauthId)).thenReturn(Optional.empty());

        // When & Then
        UserDoesNotExistException exception = assertThrows(
                UserDoesNotExistException.class,
                () -> userService.getProfile(oauthId, oauthProvider));

        assertTrue(exception.getMessage().contains(oauthProvider.toString()));
        assertTrue(exception.getMessage().contains(oauthId));
        assertTrue(exception.getMessage().contains("does not exist"));

        verify(userRepository).findByOauthProviderAndOauthId(oauthProvider, oauthId);
    }

    @Test
    void getProfile_WithDifferentOAuthProvider_Success() {
        // Given - Test with Google provider
        OAuthProvider googleProvider = OAuthProvider.GOOGLE;
        String googleOauthId = "google123";
        User googleUser = new User();
        googleUser.setId(2L);
        googleUser.setUsername("googleuser");
        googleUser.setEmail("google@example.com");
        googleUser.setOauthProvider(googleProvider);
        googleUser.setOauthId(googleOauthId);
        googleUser.setFullName("Google User");

        when(userRepository.findByOauthProviderAndOauthId(googleProvider, googleOauthId))
                .thenReturn(Optional.of(googleUser));

        // When
        User result = userService.getProfile(googleOauthId, googleProvider);

        // Then
        assertNotNull(result);
        assertEquals(googleUser.getId(), result.getId());
        assertEquals(googleUser.getUsername(), result.getUsername());
        assertEquals(googleUser.getOauthProvider(), result.getOauthProvider());
        assertEquals(googleUser.getOauthId(), result.getOauthId());

        verify(userRepository).findByOauthProviderAndOauthId(googleProvider, googleOauthId);
    }

    @Test
    void getProfile_WithUserWithoutAvatarUrl_Success() {
        // Given - User without avatar URL
        User userWithoutAvatar = new User();
        userWithoutAvatar.setId(3L);
        userWithoutAvatar.setUsername("noavatar");
        userWithoutAvatar.setEmail("noavatar@example.com");
        userWithoutAvatar.setOauthProvider(oauthProvider);
        userWithoutAvatar.setOauthId("noavatar123");
        userWithoutAvatar.setAvatarUrl(null);
        userWithoutAvatar.setFullName("No Avatar User");

        when(userRepository.findByOauthProviderAndOauthId(oauthProvider, "noavatar123"))
                .thenReturn(Optional.of(userWithoutAvatar));

        // When
        User result = userService.getProfile("noavatar123", oauthProvider);

        // Then
        assertNotNull(result);
        assertNull(result.getAvatarUrl());
        assertEquals(userWithoutAvatar.getUsername(), result.getUsername());
        assertEquals(userWithoutAvatar.getFullName(), result.getFullName());

        verify(userRepository).findByOauthProviderAndOauthId(oauthProvider, "noavatar123");
    }

    // ===============================
    // EDGE CASE TESTS
    // ===============================

    @Test
    void signUp_WithEmptyStringValues_Success() {
        // Given - Test with empty avatar URL
        String emptyAvatarUrl = "";
        when(userRepository.existsByOauthProviderAndOauthId(oauthProvider, oauthId)).thenReturn(false);
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        // When
        assertDoesNotThrow(() -> userService.signUp(username, email, oauthProvider, oauthId, emptyAvatarUrl, fullName));

        // Then
        verify(userRepository).existsByOauthProviderAndOauthId(oauthProvider, oauthId);
        verify(userRepository).save(argThat(user -> emptyAvatarUrl.equals(user.getAvatarUrl())));
    }

    @Test
    void getProfile_ParameterOrder_Success() {
        // Given - Test that parameter order matters (oauthId first, then provider)
        when(userRepository.findByOauthProviderAndOauthId(oauthProvider, oauthId)).thenReturn(Optional.of(testUser));

        // When
        User result = userService.getProfile(oauthId, oauthProvider);

        // Then
        assertNotNull(result);
        assertEquals(testUser, result);

        verify(userRepository).findByOauthProviderAndOauthId(oauthProvider, oauthId);
    }
}
