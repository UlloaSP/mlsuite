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

import dev.ulloasp.mlsuite.user.exceptions.UserAlreadyExistsException;
import dev.ulloasp.mlsuite.user.exceptions.UserDoesNotExistException;
import dev.ulloasp.mlsuite.user.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class OAuth2AuthenticationSuccessHandler implements AuthenticationSuccessHandler {

    private final UserService userService;
    private final OAuth2UserProfileExtractor profileExtractor;

    public OAuth2AuthenticationSuccessHandler(UserService userService, OAuth2UserProfileExtractor profileExtractor) {
        this.userService = userService;
        this.profileExtractor = profileExtractor;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
            Authentication authentication) throws IOException {
        OAuth2UserProfile profile = profileExtractor.extract((OAuth2AuthenticationToken) authentication);

        try {
            userService.signIn(profile.identity().provider(), profile.identity().subject());
        } catch (UserDoesNotExistException ex) {
            try {
                userService.signUp(
                        profile.username(),
                        profile.email(),
                        profile.identity().provider(),
                        profile.identity().subject(),
                        profile.avatarUrl(),
                        profile.fullName());
            } catch (UserAlreadyExistsException e) {
                // Raza: otro hilo lo creó; volvemos a intentar login
                userService.signIn(profile.identity().provider(), profile.identity().subject());
            }
        }
        response.sendRedirect("https://localhost:5173/models");
    }
}
