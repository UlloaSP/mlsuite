package dev.ulloasp.mlsuite.controller;

import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @GetMapping("/login-options")
    public Map<String, Object> getLoginOptions() {
        return Map.of(
                "jwt", Map.of(
                        "endpoint", "/api/auth/login",
                        "method", "POST",
                        "description", "Login with username/password to get JWT token"
                ),
                "oauth2", Map.of(
                        "google", "/oauth2/authorization/google",
                        "github", "/oauth2/authorization/github",
                        "description", "OAuth2 login redirects to provider"
                )
        );
    }

    @GetMapping("/status")
    public Map<String, String> getAuthStatus() {
        return Map.of(
                "message", "Authentication service is running",
                "supportedMethods", "JWT, OAuth2 (Google, GitHub)"
        );
    }
}
