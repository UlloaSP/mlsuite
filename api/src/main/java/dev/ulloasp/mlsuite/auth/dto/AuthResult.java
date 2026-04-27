package dev.ulloasp.mlsuite.auth.dto;

import org.springframework.security.core.Authentication;

public record AuthResult(
        String email,
        Authentication authentication) {
}
