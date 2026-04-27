package dev.ulloasp.mlsuite.auth.service;

import dev.ulloasp.mlsuite.auth.dto.AuthResult;
import dev.ulloasp.mlsuite.auth.dto.LoginRequest;
import dev.ulloasp.mlsuite.auth.dto.RegisterRequest;

public interface AuthService {
    AuthResult register(RegisterRequest request);

    AuthResult login(LoginRequest request);
}
