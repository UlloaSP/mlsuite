package dev.ulloasp.mlsuite.auth.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;

import dev.ulloasp.mlsuite.auth.dto.LoginRequest;
import dev.ulloasp.mlsuite.auth.dto.RegisterRequest;
import dev.ulloasp.mlsuite.user.dto.UserDto;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

@RequestMapping("/api/auth")
public interface AuthController {

    @PostMapping("/register")
    ResponseEntity<UserDto> register(@Valid @RequestBody RegisterRequest request, HttpServletRequest servletRequest);

    @PostMapping("/login")
    ResponseEntity<UserDto> login(@Valid @RequestBody LoginRequest request, HttpServletRequest servletRequest);

    @PostMapping("/logout")
    ResponseEntity<Void> logout(HttpServletRequest servletRequest);
}
