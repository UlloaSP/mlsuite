package dev.ulloasp.mlsuite.security.oauth2;

import java.io.IOException;

import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import dev.ulloasp.mlsuite.user.entity.OAuthProvider;
import dev.ulloasp.mlsuite.user.exceptions.UserAlreadyExistsException;
import dev.ulloasp.mlsuite.user.exceptions.UserDoesNotExistException;
import dev.ulloasp.mlsuite.user.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class OAuth2AuthenticationSuccessHandler implements AuthenticationSuccessHandler {

    private final UserService userService;

    public OAuth2AuthenticationSuccessHandler(UserService userService) {
        this.userService = userService;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication) throws IOException {
        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
        String registrationId = ((OAuth2AuthenticationToken) authentication).getAuthorizedClientRegistrationId();

        String name = oAuth2User.getAttribute("name");
        String email = oAuth2User.getAttribute("email");
        String avatarUrl = "";
        String oauthId = "";
        String userName = "";

        if (registrationId.equals("github")) {
            Object idAttr = oAuth2User.getAttribute("id");
            if (idAttr != null) {
                oauthId = idAttr.toString();
            }
            userName = oAuth2User.getAttribute("login");
            avatarUrl = oAuth2User.getAttribute("avatar_url");
        }
        if (registrationId.equals("google")) {

            Object idAttr = oAuth2User.getAttribute("sub");
            if (idAttr != null) {
                oauthId = idAttr.toString();
            }
            userName = oAuth2User.getAttribute("given_name");
            avatarUrl = oAuth2User.getAttribute("picture");
        }

        try {
            userService.signIn(OAuthProvider.fromString(registrationId), oauthId);
        } catch (UserDoesNotExistException ex) {
            try {
                userService.signUp(userName, email, OAuthProvider.fromString(registrationId), oauthId, userName, avatarUrl, name);
            } catch (UserAlreadyExistsException e) {
                // Raza: otro hilo lo creó; volvemos a intentar login
                userService.signIn(OAuthProvider.fromString(registrationId), oauthId);
            }
        }
        response.sendRedirect("http://localhost:5173/");
    }
}
