package dev.ulloasp.mlsuite.security.oauth2;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.IOException;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;

import dev.ulloasp.mlsuite.user.entity.OAuthProvider;
import dev.ulloasp.mlsuite.user.exceptions.UserAlreadyExistsException;
import dev.ulloasp.mlsuite.user.exceptions.UserDoesNotExistException;
import dev.ulloasp.mlsuite.user.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@ExtendWith(MockitoExtension.class)
class OAuth2AuthenticationSuccessHandlerTest {

    @Mock
    private UserService userService;

    @Mock
    private HttpServletRequest request;

    @Mock
    private HttpServletResponse response;

    @Mock(lenient = true)
    private OAuth2AuthenticationToken authentication;

    @Mock
    private OAuth2User oAuth2User;

    @InjectMocks
    private OAuth2AuthenticationSuccessHandler successHandler;

    @BeforeEach
    void setUp() {
        when(authentication.getPrincipal()).thenReturn(oAuth2User);
    }

    @Test
    void onAuthenticationSuccess_GitHub_ExistingUser() throws IOException {
        // Given
        when(authentication.getAuthorizedClientRegistrationId()).thenReturn("github");
        when(oAuth2User.getAttribute("name")).thenReturn("John Doe");
        when(oAuth2User.getAttribute("email")).thenReturn("john@example.com");
        when(oAuth2User.getAttribute("id")).thenReturn(12345);
        when(oAuth2User.getAttribute("login")).thenReturn("johndoe");
        when(oAuth2User.getAttribute("avatar_url")).thenReturn("https://avatar.url");

        // User exists, no exception
        doNothing().when(userService).signIn(eq(OAuthProvider.GITHUB), eq("12345"));

        // When
        successHandler.onAuthenticationSuccess(request, response, authentication);

        // Then
        verify(userService).signIn(eq(OAuthProvider.GITHUB), eq("12345"));
        verify(userService, never()).signUp(anyString(), anyString(), any(), anyString(), anyString(), anyString());
        verify(response).sendRedirect("https://localhost:5173/");
    }

    @Test
    void onAuthenticationSuccess_GitHub_NewUser() throws IOException {
        // Given
        when(authentication.getAuthorizedClientRegistrationId()).thenReturn("github");
        when(oAuth2User.getAttribute("name")).thenReturn("John Doe");
        when(oAuth2User.getAttribute("email")).thenReturn("john@example.com");
        when(oAuth2User.getAttribute("id")).thenReturn(12345);
        when(oAuth2User.getAttribute("login")).thenReturn("johndoe");
        when(oAuth2User.getAttribute("avatar_url")).thenReturn("https://avatar.url");

        // User doesn't exist
        doThrow(new UserDoesNotExistException("github", "12345"))
                .when(userService).signIn(eq(OAuthProvider.GITHUB), eq("12345"));

        // When
        successHandler.onAuthenticationSuccess(request, response, authentication);

        // Then
        verify(userService).signIn(eq(OAuthProvider.GITHUB), eq("12345"));
        verify(userService).signUp(eq("johndoe"), eq("john@example.com"), eq(OAuthProvider.GITHUB),
                eq("12345"), eq("https://avatar.url"), eq("John Doe"));
        verify(response).sendRedirect("https://localhost:5173/");
    }

    @Test
    void onAuthenticationSuccess_GitHub_NewUser_RaceCondition() throws IOException {
        // Given
        when(authentication.getAuthorizedClientRegistrationId()).thenReturn("github");
        when(oAuth2User.getAttribute("name")).thenReturn("John Doe");
        when(oAuth2User.getAttribute("email")).thenReturn("john@example.com");
        when(oAuth2User.getAttribute("id")).thenReturn(12345);
        when(oAuth2User.getAttribute("login")).thenReturn("johndoe");
        when(oAuth2User.getAttribute("avatar_url")).thenReturn("https://avatar.url");

        // First signIn fails - user doesn't exist
        doThrow(new UserDoesNotExistException("github", "12345"))
                .doNothing() // Second signIn succeeds
                .when(userService).signIn(eq(OAuthProvider.GITHUB), eq("12345"));

        // SignUp fails - race condition, another thread created the user
        doThrow(new UserAlreadyExistsException("github", "12345"))
                .when(userService).signUp(anyString(), anyString(), any(), anyString(), anyString(), anyString());

        // When
        successHandler.onAuthenticationSuccess(request, response, authentication);

        // Then
        verify(userService, times(2)).signIn(eq(OAuthProvider.GITHUB), eq("12345"));
        verify(userService).signUp(eq("johndoe"), eq("john@example.com"), eq(OAuthProvider.GITHUB),
                eq("12345"), eq("https://avatar.url"), eq("John Doe"));
        verify(response).sendRedirect("https://localhost:5173/");
    }

    @Test
    void onAuthenticationSuccess_Google_ExistingUser() throws IOException {
        // Given
        when(authentication.getAuthorizedClientRegistrationId()).thenReturn("google");
        when(oAuth2User.getAttribute("name")).thenReturn("Jane Doe");
        when(oAuth2User.getAttribute("email")).thenReturn("jane@example.com");
        when(oAuth2User.getAttribute("sub")).thenReturn("google-sub-123");
        when(oAuth2User.getAttribute("given_name")).thenReturn("Jane");
        when(oAuth2User.getAttribute("picture")).thenReturn("https://picture.url");

        // User exists, no exception
        doNothing().when(userService).signIn(eq(OAuthProvider.GOOGLE), eq("google-sub-123"));

        // When
        successHandler.onAuthenticationSuccess(request, response, authentication);

        // Then
        verify(userService).signIn(eq(OAuthProvider.GOOGLE), eq("google-sub-123"));
        verify(userService, never()).signUp(anyString(), anyString(), any(), anyString(), anyString(), anyString());
        verify(response).sendRedirect("https://localhost:5173/");
    }

    @Test
    void onAuthenticationSuccess_Google_NewUser() throws IOException {
        // Given
        when(authentication.getAuthorizedClientRegistrationId()).thenReturn("google");
        when(oAuth2User.getAttribute("name")).thenReturn("Jane Doe");
        when(oAuth2User.getAttribute("email")).thenReturn("jane@example.com");
        when(oAuth2User.getAttribute("sub")).thenReturn("google-sub-123");
        when(oAuth2User.getAttribute("given_name")).thenReturn("Jane");
        when(oAuth2User.getAttribute("picture")).thenReturn("https://picture.url");

        // User doesn't exist
        doThrow(new UserDoesNotExistException("google", "google-sub-123"))
                .when(userService).signIn(eq(OAuthProvider.GOOGLE), eq("google-sub-123"));

        // When
        successHandler.onAuthenticationSuccess(request, response, authentication);

        // Then
        verify(userService).signIn(eq(OAuthProvider.GOOGLE), eq("google-sub-123"));
        verify(userService).signUp(eq("Jane"), eq("jane@example.com"), eq(OAuthProvider.GOOGLE),
                eq("google-sub-123"), eq("https://picture.url"), eq("Jane Doe"));
        verify(response).sendRedirect("https://localhost:5173/");
    }

    @Test
    void onAuthenticationSuccess_GitHub_NullAttributes() throws IOException {
        // Given
        when(authentication.getAuthorizedClientRegistrationId()).thenReturn("github");
        when(oAuth2User.getAttribute("name")).thenReturn("John Doe");
        when(oAuth2User.getAttribute("email")).thenReturn("john@example.com");
        when(oAuth2User.getAttribute("id")).thenReturn(null); // null ID
        when(oAuth2User.getAttribute("login")).thenReturn("johndoe");
        when(oAuth2User.getAttribute("avatar_url")).thenReturn("https://avatar.url");

        // User doesn't exist
        doThrow(new UserDoesNotExistException("github", ""))
                .when(userService).signIn(eq(OAuthProvider.GITHUB), eq(""));

        // When
        successHandler.onAuthenticationSuccess(request, response, authentication);

        // Then
        verify(userService).signIn(eq(OAuthProvider.GITHUB), eq(""));
        verify(userService).signUp(eq("johndoe"), eq("john@example.com"), eq(OAuthProvider.GITHUB),
                eq(""), eq("https://avatar.url"), eq("John Doe"));
        verify(response).sendRedirect("https://localhost:5173/");
    }

    @Test
    void onAuthenticationSuccess_Google_NullAttributes() throws IOException {
        // Given
        when(authentication.getAuthorizedClientRegistrationId()).thenReturn("google");
        when(oAuth2User.getAttribute("name")).thenReturn("Jane Doe");
        when(oAuth2User.getAttribute("email")).thenReturn("jane@example.com");
        when(oAuth2User.getAttribute("sub")).thenReturn(null); // null sub
        when(oAuth2User.getAttribute("given_name")).thenReturn("Jane");
        when(oAuth2User.getAttribute("picture")).thenReturn("https://picture.url");

        // User doesn't exist
        doThrow(new UserDoesNotExistException("google", ""))
                .when(userService).signIn(eq(OAuthProvider.GOOGLE), eq(""));

        // When
        successHandler.onAuthenticationSuccess(request, response, authentication);

        // Then
        verify(userService).signIn(eq(OAuthProvider.GOOGLE), eq(""));
        verify(userService).signUp(eq("Jane"), eq("jane@example.com"), eq(OAuthProvider.GOOGLE),
                eq(""), eq("https://picture.url"), eq("Jane Doe"));
        verify(response).sendRedirect("https://localhost:5173/");
    }

    @Test
    void onAuthenticationSuccess_SystemProvider() throws IOException {
        // Given
        when(authentication.getAuthorizedClientRegistrationId()).thenReturn("system");
        when(oAuth2User.getAttribute("name")).thenReturn("System User");
        when(oAuth2User.getAttribute("email")).thenReturn("system@example.com");

        // User exists
        doNothing().when(userService).signIn(eq(OAuthProvider.SYSTEM), eq(""));

        // When
        successHandler.onAuthenticationSuccess(request, response, authentication);

        // Then
        verify(userService).signIn(eq(OAuthProvider.SYSTEM), eq(""));
        verify(response).sendRedirect("https://localhost:5173/");
    }

    @Test
    void constructor_ShouldCreateInstance() {
        // When
        OAuth2AuthenticationSuccessHandler handler = new OAuth2AuthenticationSuccessHandler(userService);

        // Then
        assertNotNull(handler);
    }
}
