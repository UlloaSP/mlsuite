/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.security.oauth2;

import java.io.IOException;

import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import dev.ulloasp.mlsuite.user.application.port.in.SignInUserUseCase;
import dev.ulloasp.mlsuite.user.application.port.in.SignUpUserUseCase;
import dev.ulloasp.mlsuite.user.domain.exception.UserAlreadyExistsException;
import dev.ulloasp.mlsuite.user.domain.exception.UserDoesNotExistException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class OAuth2AuthenticationSuccessHandler implements AuthenticationSuccessHandler {

    private final SignInUserUseCase signInUserUseCase;
    private final SignUpUserUseCase signUpUserUseCase;
    private final OAuth2UserProfileExtractor profileExtractor;

    public OAuth2AuthenticationSuccessHandler(
            SignInUserUseCase signInUserUseCase,
            SignUpUserUseCase signUpUserUseCase,
            OAuth2UserProfileExtractor profileExtractor) {
        this.signInUserUseCase = signInUserUseCase;
        this.signUpUserUseCase = signUpUserUseCase;
        this.profileExtractor = profileExtractor;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
            Authentication authentication) throws IOException {
        OAuth2UserProfile profile = profileExtractor.extract((OAuth2AuthenticationToken) authentication);

        try {
            signInUserUseCase.signIn(profile.identity().provider(), profile.identity().subject());
        } catch (UserDoesNotExistException ex) {
            try {
                signUpUserUseCase.signUp(
                        profile.username(),
                        profile.email(),
                        profile.identity().provider(),
                        profile.identity().subject(),
                        profile.avatarUrl(),
                        profile.fullName());
            } catch (UserAlreadyExistsException e) {
                // Raza: otro hilo lo creó; volvemos a intentar login
                signInUserUseCase.signIn(profile.identity().provider(), profile.identity().subject());
            }
        }
        response.sendRedirect("https://localhost:5173/models");
    }
}

