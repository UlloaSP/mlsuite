package dev.ulloasp.mlsuite.user.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;

import dev.ulloasp.mlsuite.user.dto.UpdateProfileParams;
import dev.ulloasp.mlsuite.user.dto.UserDto;
import dev.ulloasp.mlsuite.user.exceptions.UserAlreadyActiveException;
import dev.ulloasp.mlsuite.user.exceptions.UserAlreadyDeactivatedException;
import dev.ulloasp.mlsuite.user.exceptions.UserDoesNotExistException;

@RequestMapping("/api/user")
public interface UserController {

    @GetMapping("/profile")
    public ResponseEntity<UserDto> getProfile(OAuth2AuthenticationToken authentication) throws UserDoesNotExistException;

    @PostMapping("/profile/update")
    public ResponseEntity<UserDto> updateProfile(OAuth2AuthenticationToken authentication, @RequestBody UpdateProfileParams updateProfileParams)
            throws UserDoesNotExistException;

    @PostMapping("/profile/deactivate")
    public ResponseEntity<UserDto> deactivateUser(OAuth2AuthenticationToken authentication) throws UserDoesNotExistException, UserAlreadyDeactivatedException;

    @PostMapping("/profile/activate")
    public ResponseEntity<UserDto> activateUser(OAuth2AuthenticationToken authentication) throws UserDoesNotExistException, UserAlreadyActiveException;
}
