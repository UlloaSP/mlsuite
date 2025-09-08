package dev.ulloasp.mlsuite.user.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import dev.ulloasp.mlsuite.user.dto.UserDto;
import dev.ulloasp.mlsuite.user.entity.OAuthProvider;
import dev.ulloasp.mlsuite.user.entity.User;
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
    public ResponseEntity<UserDto> getProfile(OAuth2AuthenticationToken authentication)
            throws UserDoesNotExistException {
        String oauthId = authentication.getPrincipal().getName();
        String provider = authentication.getAuthorizedClientRegistrationId();

        User user = userService.getProfile(oauthId, OAuthProvider.fromString(provider));

        return ResponseEntity.ok(UserDto.toDto(user));
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

}
