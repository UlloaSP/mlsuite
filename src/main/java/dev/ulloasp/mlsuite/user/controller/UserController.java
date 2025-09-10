package dev.ulloasp.mlsuite.user.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

import dev.ulloasp.mlsuite.user.dto.UserDto;
import dev.ulloasp.mlsuite.user.exceptions.UserDoesNotExistException;

@RequestMapping("/api/user")
public interface UserController {

    @GetMapping("/profile")
    public ResponseEntity<UserDto> getProfile(OAuth2AuthenticationToken authentication)
            throws UserDoesNotExistException;
}
