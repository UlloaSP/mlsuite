package dev.ulloasp.mlsuite.user.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import dev.ulloasp.mlsuite.user.dto.UpdateProfileParams;
import dev.ulloasp.mlsuite.user.dto.UserConversor;
import dev.ulloasp.mlsuite.user.dto.UserDto;
import dev.ulloasp.mlsuite.user.entity.OAuthProvider;
import dev.ulloasp.mlsuite.user.exceptions.UserAlreadyActiveException;
import dev.ulloasp.mlsuite.user.exceptions.UserAlreadyDeactivatedException;
import dev.ulloasp.mlsuite.user.exceptions.UserAlreadyExistsException;
import dev.ulloasp.mlsuite.user.exceptions.UserDoesNotExistException;
import dev.ulloasp.mlsuite.user.service.UserService;
import dev.ulloasp.mlsuite.util.ErrorsDto;

@RestController
public class UserControllerImpl implements UserController {

    private final UserService userService;

    public UserControllerImpl(UserService userService) {
        this.userService = userService;
    }

    @Override
    public ResponseEntity<UserDto> getProfile(OAuth2AuthenticationToken authentication) throws UserDoesNotExistException {
        OAuth2User principal = authentication.getPrincipal();
        /* 1. ID independiente del proveedor ------------------------------ */
        String oauthId = principal.getName();           // "112677970733946837191" o "8514372" …

        /* 2. Proveedor ("google", "github", …) --------------------------- */
        String provider = authentication.getAuthorizedClientRegistrationId();

        /* 3. Tu lógica de negocio --------------------------------------- */
        return ResponseEntity.ok(UserConversor.toDto(userService.getProfile(oauthId, OAuthProvider.fromString(provider))));
    }

    @Override
    public ResponseEntity<UserDto> updateProfile(OAuth2AuthenticationToken authentication, UpdateProfileParams updateProfileParams) throws UserDoesNotExistException {
        OAuth2User principal = authentication.getPrincipal();
        /* 1. ID independiente del proveedor ------------------------------ */
        String oauthId = principal.getName();           // "112677970733946837191" o "8514372" …

        /* 2. Proveedor ("google", "github", …) --------------------------- */
        String provider = authentication.getAuthorizedClientRegistrationId();

        return ResponseEntity.ok(
                UserConversor.toDto(userService.updateProfile(oauthId, OAuthProvider.fromString(provider), updateProfileParams.getDisplayName()))
        );
    }

    @Override
    public ResponseEntity<UserDto> deactivateUser(OAuth2AuthenticationToken authentication) throws UserDoesNotExistException, UserAlreadyDeactivatedException {
        OAuth2User principal = authentication.getPrincipal();
        /* 1. ID independiente del proveedor ------------------------------ */
        String oauthId = principal.getName();           // "112677970733946837191" o "8514372" …

        /* 2. Proveedor ("google", "github", …) --------------------------- */
        String provider = authentication.getAuthorizedClientRegistrationId();

        return ResponseEntity.ok(
                UserConversor.toDto(userService.deactivateAccount(oauthId, OAuthProvider.fromString(provider)))
        );
    }

    @Override
    public ResponseEntity<UserDto> activateUser(OAuth2AuthenticationToken authentication) throws UserDoesNotExistException, UserAlreadyActiveException {
        OAuth2User principal = authentication.getPrincipal();
        /* 1. ID independiente del proveedor ------------------------------ */
        String oauthId = principal.getName();           // "112677970733946837191" o "8514372" …

        /* 2. Proveedor ("google", "github", …) --------------------------- */
        String provider = authentication.getAuthorizedClientRegistrationId();

        return ResponseEntity.ok(
                UserConversor.toDto(userService.activateAccount(oauthId, OAuthProvider.fromString(provider)))
        );
    }

    @ExceptionHandler(UserDoesNotExistException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ErrorsDto handleUserDoesNotExistException(UserDoesNotExistException e) {
        return new ErrorsDto(e.getMessage());
    }

    @ExceptionHandler(UserAlreadyExistsException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ErrorsDto handleUserAlreadyExistsException(UserAlreadyExistsException e) {
        return new ErrorsDto(e.getMessage());
    }

    @ExceptionHandler(UserAlreadyDeactivatedException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ErrorsDto handleUserAlreadyDeactivatedException(UserAlreadyDeactivatedException e) {
        return new ErrorsDto(e.getMessage());
    }

    @ExceptionHandler(UserAlreadyActiveException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ErrorsDto handleUserAlreadyActiveException(UserAlreadyActiveException e) {
        return new ErrorsDto(e.getMessage());
    }

}
