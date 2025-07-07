package dev.ulloasp.mlsuite.security.oauth2;

import java.io.IOException;

import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import dev.ulloasp.mlsuite.security.jwt.JwtGenerator;
import dev.ulloasp.mlsuite.security.jwt.JwtInfo;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class OAuth2AuthenticationSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final JwtGenerator jwtGenerator;

    public OAuth2AuthenticationSuccessHandler(JwtGenerator jwtGenerator) {
        this.jwtGenerator = jwtGenerator;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
            Authentication authentication) throws IOException, ServletException {

        OAuth2User oauth2User = (OAuth2User) authentication.getPrincipal();

        // Extraer información del usuario OAuth2
        String email = oauth2User.getAttribute("email");
        String name = oauth2User.getAttribute("name");

        // Crear JWT token con la información del usuario OAuth2
        JwtInfo jwtInfo = new JwtInfo(
                generateUserId(email), // Generar o buscar ID de usuario
                email != null ? email : name,
                "USER" // Rol por defecto para usuarios OAuth2
        );

        String jwtToken = jwtGenerator.generate(jwtInfo);

        // Redireccionar al frontend servido por Spring Boot (puerto 8080)
        String redirectUrl = String.format("http://localhost:8080/?token=%s&user=%s",
                jwtToken, name != null ? name : email);
        getRedirectStrategy().sendRedirect(request, response, redirectUrl);
    }

    private Long generateUserId(String email) {
        // Aquí deberías buscar o crear el usuario en tu base de datos
        // Por ahora retornamos un hash del email como ID temporal
        return email != null ? (long) email.hashCode() : 1L;
    }
}
