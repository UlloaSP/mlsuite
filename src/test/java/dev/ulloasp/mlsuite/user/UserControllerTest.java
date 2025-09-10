package dev.ulloasp.mlsuite.user;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

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

import dev.ulloasp.mlsuite.user.controller.UserControllerImpl;
import dev.ulloasp.mlsuite.user.dto.UserDto;
import dev.ulloasp.mlsuite.user.entity.OAuthProvider;
import dev.ulloasp.mlsuite.user.entity.User;
import dev.ulloasp.mlsuite.user.exceptions.UserAlreadyExistsException;
import dev.ulloasp.mlsuite.user.exceptions.UserDoesNotExistException;
import dev.ulloasp.mlsuite.user.service.UserService;
import dev.ulloasp.mlsuite.util.ErrorDto;
import jakarta.servlet.http.HttpServletRequest;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class UserControllerTest {

    @Mock
    private UserService userService;

    @Mock
    private OAuth2AuthenticationToken mockAuthentication;

    @Mock
    private OAuth2User mockOAuth2User;

    @Mock
    private HttpServletRequest mockRequest;

    @InjectMocks
    private UserControllerImpl userController;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(1L);
        testUser.setUsername("testuser");
        testUser.setEmail("test@example.com");
        testUser.setOauthProvider(OAuthProvider.GITHUB);
        testUser.setOauthId("github123");
        testUser.setFullName("Test User");
        testUser.setAvatarUrl("https://example.com/avatar.jpg");
        testUser.setCreatedAt(OffsetDateTime.of(2024, 1, 15, 10, 30, 0, 0, ZoneOffset.UTC));

        // Setup mock request
        when(mockRequest.getRequestURI()).thenReturn("/api/user/profile");
    }

    // Tests for getProfile method

    @Test
    void getProfile_Success_GitHubProvider() {
        // Given
        when(mockAuthentication.getAuthorizedClientRegistrationId()).thenReturn("github");
        when(mockAuthentication.getPrincipal()).thenReturn(mockOAuth2User);
        when(mockOAuth2User.getName()).thenReturn("github123");

        when(userService.getProfile(eq("github123"), eq(OAuthProvider.GITHUB)))
                .thenReturn(testUser);

        // When
        ResponseEntity<UserDto> response = userController.getProfile(mockAuthentication);

        // Then
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());

        UserDto userDto = response.getBody();
        assertNotNull(userDto);
        assertEquals(1L, userDto.getId());
        assertEquals("testuser", userDto.getUserName());
        assertEquals("test@example.com", userDto.getEmail());
        assertEquals("github", userDto.getOauthProvider()); // toString() returns displayName in lowercase
        assertEquals("Test User", userDto.getFullName());
        assertEquals("https://example.com/avatar.jpg", userDto.getAvatarUrl());
        assertEquals("Jan, 2024", userDto.getCreatedAt());

        verify(userService).getProfile(eq("github123"), eq(OAuthProvider.GITHUB));
    }

    @Test
    void getProfile_Success_GoogleProvider() {
        // Given
        when(mockAuthentication.getAuthorizedClientRegistrationId()).thenReturn("google");
        when(mockAuthentication.getPrincipal()).thenReturn(mockOAuth2User);
        when(mockOAuth2User.getName()).thenReturn("google456");

        User googleUser = new User();
        googleUser.setId(2L);
        googleUser.setUsername("googleuser");
        googleUser.setEmail("google@example.com");
        googleUser.setOauthProvider(OAuthProvider.GOOGLE);
        googleUser.setOauthId("google456");
        googleUser.setFullName("Google User");
        googleUser.setAvatarUrl("https://example.com/google-avatar.jpg");
        googleUser.setCreatedAt(OffsetDateTime.of(2024, 6, 10, 14, 20, 0, 0, ZoneOffset.UTC));

        when(userService.getProfile(eq("google456"), eq(OAuthProvider.GOOGLE)))
                .thenReturn(googleUser);

        // When
        ResponseEntity<UserDto> response = userController.getProfile(mockAuthentication);

        // Then
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());

        UserDto userDto = response.getBody();
        assertNotNull(userDto);
        assertEquals(2L, userDto.getId());
        assertEquals("googleuser", userDto.getUserName());
        assertEquals("google@example.com", userDto.getEmail());
        assertEquals("google", userDto.getOauthProvider()); // toString() returns displayName in lowercase
        assertEquals("Google User", userDto.getFullName());
        assertEquals("https://example.com/google-avatar.jpg", userDto.getAvatarUrl());
        assertEquals("Jun, 2024", userDto.getCreatedAt());

        verify(userService).getProfile(eq("google456"), eq(OAuthProvider.GOOGLE));
    }

    @Test
    void getProfile_Success_SystemProvider() {
        // Given
        when(mockAuthentication.getAuthorizedClientRegistrationId()).thenReturn("system");
        when(mockAuthentication.getPrincipal()).thenReturn(mockOAuth2User);
        when(mockOAuth2User.getName()).thenReturn("system789");

        User systemUser = new User();
        systemUser.setId(3L);
        systemUser.setUsername("systemuser");
        systemUser.setEmail("system@example.com");
        systemUser.setOauthProvider(OAuthProvider.SYSTEM);
        systemUser.setOauthId("system789");
        systemUser.setFullName("System User");
        systemUser.setAvatarUrl("https://example.com/system-avatar.jpg");
        systemUser.setCreatedAt(OffsetDateTime.of(2024, 12, 1, 9, 15, 0, 0, ZoneOffset.UTC));

        when(userService.getProfile(eq("system789"), eq(OAuthProvider.SYSTEM)))
                .thenReturn(systemUser);

        // When
        ResponseEntity<UserDto> response = userController.getProfile(mockAuthentication);

        // Then
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());

        UserDto userDto = response.getBody();
        assertNotNull(userDto);
        assertEquals(3L, userDto.getId());
        assertEquals("systemuser", userDto.getUserName());
        assertEquals("system@example.com", userDto.getEmail());
        assertEquals("system", userDto.getOauthProvider()); // toString() returns displayName in lowercase
        assertEquals("System User", userDto.getFullName());
        assertEquals("https://example.com/system-avatar.jpg", userDto.getAvatarUrl());
        assertEquals("Dec, 2024", userDto.getCreatedAt());

        verify(userService).getProfile(eq("system789"), eq(OAuthProvider.SYSTEM));
    }

    @Test
    void getProfile_UserDoesNotExistException() {
        // Given
        when(mockAuthentication.getAuthorizedClientRegistrationId()).thenReturn("github");
        when(mockAuthentication.getPrincipal()).thenReturn(mockOAuth2User);
        when(mockOAuth2User.getName()).thenReturn("github123");

        UserDoesNotExistException exception = new UserDoesNotExistException("GITHUB", "nonexistent123");
        when(userService.getProfile(eq("github123"), eq(OAuthProvider.GITHUB)))
                .thenThrow(exception);

        // When & Then
        UserDoesNotExistException thrownException = assertThrows(UserDoesNotExistException.class,
                () -> userController.getProfile(mockAuthentication));

        assertEquals("User with OAuth provider 'GITHUB' and ID 'nonexistent123' does not exist",
                thrownException.getMessage());

        verify(userService).getProfile(eq("github123"), eq(OAuthProvider.GITHUB));
    }

    @Test
    void getProfile_DifferentOAuthIds() {
        // Given
        String[] oauthIds = { "user1", "user2", "test123", "oauth456" };

        for (String oauthId : oauthIds) {
            when(mockAuthentication.getAuthorizedClientRegistrationId()).thenReturn("github");
            when(mockAuthentication.getPrincipal()).thenReturn(mockOAuth2User);
            when(mockOAuth2User.getName()).thenReturn(oauthId);

            User user = new User();
            user.setId(1L);
            user.setUsername("user_" + oauthId);
            user.setEmail(oauthId + "@example.com");
            user.setOauthProvider(OAuthProvider.GITHUB);
            user.setOauthId(oauthId);
            user.setFullName("User " + oauthId);
            user.setAvatarUrl("https://example.com/" + oauthId + ".jpg");
            user.setCreatedAt(OffsetDateTime.of(2024, 1, 1, 12, 0, 0, 0, ZoneOffset.UTC));

            when(userService.getProfile(eq(oauthId), eq(OAuthProvider.GITHUB)))
                    .thenReturn(user);

            // When
            ResponseEntity<UserDto> response = userController.getProfile(mockAuthentication);

            // Then
            assertEquals(HttpStatus.OK, response.getStatusCode());
            assertNotNull(response.getBody());
            UserDto responseBody = response.getBody();
            assertNotNull(responseBody);
            assertEquals("user_" + oauthId, responseBody.getUserName());
            assertEquals(oauthId + "@example.com", responseBody.getEmail());

            verify(userService).getProfile(eq(oauthId), eq(OAuthProvider.GITHUB));
        }
    }

    // Tests for exception handlers

    @Test
    void handleUserDoesNotExistException_ReturnsNotFound() {
        // Given
        UserDoesNotExistException exception = new UserDoesNotExistException("GITHUB", "nonexistent123");

        // When
        ResponseEntity<ErrorDto> response = userController.handleUserDoesNotExistException(exception, mockRequest);

        // Then
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertNotNull(response.getBody());

        ErrorDto errorDto = response.getBody();
        assertNotNull(errorDto);
        assertEquals(404, errorDto.status());
        assertEquals("User with OAuth provider 'GITHUB' and ID 'nonexistent123' does not exist",
                errorDto.message());
        assertEquals("/api/user/profile", errorDto.path());
        assertNotNull(errorDto.timestamp());
    }

    @Test
    void handleUserDoesNotExistException_GoogleProvider() {
        // Given
        UserDoesNotExistException exception = new UserDoesNotExistException("GOOGLE", "google999");
        when(mockRequest.getRequestURI()).thenReturn("/api/user/profile");

        // When
        ResponseEntity<ErrorDto> response = userController.handleUserDoesNotExistException(exception, mockRequest);

        // Then
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertNotNull(response.getBody());

        ErrorDto errorDto = response.getBody();
        assertNotNull(errorDto);
        assertEquals(404, errorDto.status());
        assertEquals("User with OAuth provider 'GOOGLE' and ID 'google999' does not exist",
                errorDto.message());
        assertEquals("/api/user/profile", errorDto.path());
    }

    @Test
    void handleUserAlreadyExistsException_ReturnsConflict() {
        // Given
        UserAlreadyExistsException exception = new UserAlreadyExistsException("GITHUB", "existing123");
        when(mockRequest.getRequestURI()).thenReturn("/api/user/signup");

        // When
        ResponseEntity<ErrorDto> response = userController.handleUserAlreadyExistsException(exception, mockRequest);

        // Then
        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertNotNull(response.getBody());

        ErrorDto errorDto = response.getBody();
        assertNotNull(errorDto);
        assertEquals(409, errorDto.status());
        assertEquals("User already exists with OAuth provider 'GITHUB' and ID 'existing123'",
                errorDto.message());
        assertEquals("/api/user/signup", errorDto.path());
        assertNotNull(errorDto.timestamp());
    }

    @Test
    void handleUserAlreadyExistsException_SystemProvider() {
        // Given
        UserAlreadyExistsException exception = new UserAlreadyExistsException("SYSTEM", "system123");
        when(mockRequest.getRequestURI()).thenReturn("/api/user/register");

        // When
        ResponseEntity<ErrorDto> response = userController.handleUserAlreadyExistsException(exception, mockRequest);

        // Then
        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertNotNull(response.getBody());

        ErrorDto errorDto = response.getBody();
        assertNotNull(errorDto);
        assertEquals(409, errorDto.status());
        assertEquals("User already exists with OAuth provider 'SYSTEM' and ID 'system123'",
                errorDto.message());
        assertEquals("/api/user/register", errorDto.path());
    }

    @Test
    void getProfile_UserWithNullValues() {
        // Given
        when(mockAuthentication.getAuthorizedClientRegistrationId()).thenReturn("github");
        when(mockAuthentication.getPrincipal()).thenReturn(mockOAuth2User);
        when(mockOAuth2User.getName()).thenReturn("github123");

        User userWithNulls = new User();
        userWithNulls.setId(4L);
        userWithNulls.setUsername("nulluser");
        userWithNulls.setEmail("null@example.com");
        userWithNulls.setOauthProvider(OAuthProvider.GITHUB);
        userWithNulls.setOauthId("github123");
        userWithNulls.setFullName(null);
        userWithNulls.setAvatarUrl(null);
        userWithNulls.setCreatedAt(OffsetDateTime.of(2024, 3, 20, 16, 45, 0, 0, ZoneOffset.UTC));

        when(userService.getProfile(eq("github123"), eq(OAuthProvider.GITHUB)))
                .thenReturn(userWithNulls);

        // When
        ResponseEntity<UserDto> response = userController.getProfile(mockAuthentication);

        // Then
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());

        UserDto userDto = response.getBody();
        assertNotNull(userDto);
        assertEquals(4L, userDto.getId());
        assertEquals("nulluser", userDto.getUserName());
        assertEquals("null@example.com", userDto.getEmail());
        assertEquals("github", userDto.getOauthProvider()); // toString() returns displayName in lowercase
        assertNull(userDto.getFullName());
        assertNull(userDto.getAvatarUrl());
        assertEquals("Mar, 2024", userDto.getCreatedAt());

        verify(userService).getProfile(eq("github123"), eq(OAuthProvider.GITHUB));
    }

    @Test
    void getProfile_UserWithEmptyStrings() {
        // Given
        when(mockAuthentication.getAuthorizedClientRegistrationId()).thenReturn("google");
        when(mockAuthentication.getPrincipal()).thenReturn(mockOAuth2User);
        when(mockOAuth2User.getName()).thenReturn("github123");

        User userWithEmptyValues = new User();
        userWithEmptyValues.setId(5L);
        userWithEmptyValues.setUsername("emptyuser");
        userWithEmptyValues.setEmail("empty@example.com");
        userWithEmptyValues.setOauthProvider(OAuthProvider.GOOGLE);
        userWithEmptyValues.setOauthId("github123");
        userWithEmptyValues.setFullName("");
        userWithEmptyValues.setAvatarUrl("");
        userWithEmptyValues.setCreatedAt(OffsetDateTime.of(2024, 8, 5, 11, 30, 0, 0, ZoneOffset.UTC));

        when(userService.getProfile(eq("github123"), eq(OAuthProvider.GOOGLE)))
                .thenReturn(userWithEmptyValues);

        // When
        ResponseEntity<UserDto> response = userController.getProfile(mockAuthentication);

        // Then
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());

        UserDto userDto = response.getBody();
        assertNotNull(userDto);
        assertEquals(5L, userDto.getId());
        assertEquals("emptyuser", userDto.getUserName());
        assertEquals("empty@example.com", userDto.getEmail());
        assertEquals("google", userDto.getOauthProvider()); // toString() returns displayName in lowercase
        assertEquals("", userDto.getFullName());
        assertEquals("", userDto.getAvatarUrl());
        assertEquals("Aug, 2024", userDto.getCreatedAt());

        verify(userService).getProfile(eq("github123"), eq(OAuthProvider.GOOGLE));
    }

    @Test
    void getProfile_UserDoesNotExistException_DifferentProviders() {
        // Given
        OAuthProvider[] providers = { OAuthProvider.GITHUB, OAuthProvider.GOOGLE, OAuthProvider.SYSTEM };

        for (OAuthProvider provider : providers) {
            when(mockAuthentication.getAuthorizedClientRegistrationId())
                    .thenReturn(provider.toString().toLowerCase());
            when(mockAuthentication.getPrincipal()).thenReturn(mockOAuth2User);
            when(mockOAuth2User.getName()).thenReturn("github123");

            UserDoesNotExistException exception = new UserDoesNotExistException(
                    provider.toString(), "nonexistent123");
            when(userService.getProfile(eq("github123"), eq(provider)))
                    .thenThrow(exception);

            // When & Then
            UserDoesNotExistException thrownException = assertThrows(UserDoesNotExistException.class,
                    () -> userController.getProfile(mockAuthentication));

            assertEquals("User with OAuth provider '" + provider.toString() +
                    "' and ID 'nonexistent123' does not exist", thrownException.getMessage());

            verify(userService).getProfile(eq("github123"), eq(provider));
        }
    }

    @Test
    void handleUserDoesNotExistException_DifferentPaths() {
        // Given
        String[] paths = { "/api/user/profile", "/api/user/info", "/api/auth/profile" };
        UserDoesNotExistException exception = new UserDoesNotExistException("GITHUB", "nonexistent123");

        for (String path : paths) {
            when(mockRequest.getRequestURI()).thenReturn(path);

            // When
            ResponseEntity<ErrorDto> response = userController.handleUserDoesNotExistException(exception, mockRequest);

            // Then
            assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
            assertNotNull(response.getBody());
            ErrorDto responseBody = response.getBody();
            assertNotNull(responseBody);
            assertEquals(path, responseBody.path());
        }
    }

    @Test
    void handleUserAlreadyExistsException_DifferentPaths() {
        // Given
        String[] paths = { "/api/user/signup", "/api/auth/register", "/api/user/create" };
        UserAlreadyExistsException exception = new UserAlreadyExistsException("GITHUB", "existing123");

        for (String path : paths) {
            when(mockRequest.getRequestURI()).thenReturn(path);

            // When
            ResponseEntity<ErrorDto> response = userController.handleUserAlreadyExistsException(exception, mockRequest);

            // Then
            assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
            assertNotNull(response.getBody());
            ErrorDto responseBody = response.getBody();
            assertNotNull(responseBody);
            assertEquals(path, responseBody.path());
        }
    }
}
