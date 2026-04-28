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
import dev.ulloasp.mlsuite.user.application.port.in.SignInUserUseCase;
import dev.ulloasp.mlsuite.user.application.port.in.SignUpUserUseCase;
import dev.ulloasp.mlsuite.user.domain.model.OAuthProvider;
import dev.ulloasp.mlsuite.user.domain.exception.UserAlreadyExistsException;
import dev.ulloasp.mlsuite.user.domain.exception.UserDoesNotExistException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@ExtendWith(MockitoExtension.class)
class OAuth2AuthenticationSuccessHandlerTest {

    @Mock
    private SignInUserUseCase signInUserUseCase;

    @Mock
    private SignUpUserUseCase signUpUserUseCase;

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
        handler = new OAuth2AuthenticationSuccessHandler(signInUserUseCase, signUpUserUseCase, profileExtractor);
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
        doNothing().when(signInUserUseCase).signIn(OAuthProvider.GITHUB, "123");

        handler.onAuthenticationSuccess(request, response, authentication);

        verify(signInUserUseCase).signIn(OAuthProvider.GITHUB, "123");
        verify(response).sendRedirect("https://localhost:5173/models");
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
        doThrow(new UserDoesNotExistException("google", "sub-1")).when(signInUserUseCase).signIn(OAuthProvider.GOOGLE,
                "sub-1");

        handler.onAuthenticationSuccess(request, response, authentication);

        verify(signUpUserUseCase).signUp("alice", "alice@example.com", OAuthProvider.GOOGLE, "sub-1", "avatar", "Alice");
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
                .when(signInUserUseCase)
                .signIn(OAuthProvider.GITHUB, "123");
        doThrow(new UserAlreadyExistsException("github", "123"))
                .when(signUpUserUseCase)
                .signUp("alice", "alice@example.com", OAuthProvider.GITHUB, "123", "avatar", "Alice");

        handler.onAuthenticationSuccess(request, response, authentication);

        verify(signInUserUseCase, times(2)).signIn(OAuthProvider.GITHUB, "123");
    }
}

