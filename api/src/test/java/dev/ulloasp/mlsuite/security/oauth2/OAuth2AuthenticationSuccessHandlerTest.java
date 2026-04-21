package dev.ulloasp.mlsuite.security.oauth2;

import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.IOException;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;

import dev.ulloasp.mlsuite.security.identity.ExternalIdentity;
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
    private OAuth2UserProfileExtractor profileExtractor;

    @Mock
    private HttpServletRequest request;

    @Mock
    private HttpServletResponse response;

    @Mock
    private OAuth2AuthenticationToken authentication;

    private OAuth2AuthenticationSuccessHandler handler;

    @BeforeEach
    void setUp() {
        handler = new OAuth2AuthenticationSuccessHandler(userService, profileExtractor);
    }

    @Test
    void onAuthenticationSuccess_SignsInExistingUser() throws IOException {
        OAuth2UserProfile profile = new OAuth2UserProfile(
                new ExternalIdentity(OAuthProvider.GITHUB, "123"),
                "alice",
                "alice@example.com",
                "avatar",
                "Alice");
        when(profileExtractor.extract(authentication)).thenReturn(profile);
        doNothing().when(userService).signIn(OAuthProvider.GITHUB, "123");

        handler.onAuthenticationSuccess(request, response, authentication);

        verify(userService).signIn(OAuthProvider.GITHUB, "123");
        verify(response).sendRedirect("https://localhost:5173/");
    }

    @Test
    void onAuthenticationSuccess_SignsUpWhenUserMissing() throws IOException {
        OAuth2UserProfile profile = new OAuth2UserProfile(
                new ExternalIdentity(OAuthProvider.GOOGLE, "sub-1"),
                "alice",
                "alice@example.com",
                "avatar",
                "Alice");
        when(profileExtractor.extract(authentication)).thenReturn(profile);
        doThrow(new UserDoesNotExistException("google", "sub-1")).when(userService).signIn(OAuthProvider.GOOGLE,
                "sub-1");

        handler.onAuthenticationSuccess(request, response, authentication);

        verify(userService).signUp("alice", "alice@example.com", OAuthProvider.GOOGLE, "sub-1", "avatar", "Alice");
    }

    @Test
    void onAuthenticationSuccess_RetriesSignInAfterRace() throws IOException {
        OAuth2UserProfile profile = new OAuth2UserProfile(
                new ExternalIdentity(OAuthProvider.GITHUB, "123"),
                "alice",
                "alice@example.com",
                "avatar",
                "Alice");
        when(profileExtractor.extract(authentication)).thenReturn(profile);
        doThrow(new UserDoesNotExistException("github", "123"))
                .doNothing()
                .when(userService)
                .signIn(OAuthProvider.GITHUB, "123");
        doThrow(new UserAlreadyExistsException("github", "123"))
                .when(userService)
                .signUp("alice", "alice@example.com", OAuthProvider.GITHUB, "123", "avatar", "Alice");

        handler.onAuthenticationSuccess(request, response, authentication);

        verify(userService, times(2)).signIn(OAuthProvider.GITHUB, "123");
    }
}
