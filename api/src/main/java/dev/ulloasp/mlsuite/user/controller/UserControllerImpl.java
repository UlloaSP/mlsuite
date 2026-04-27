/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.user.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import dev.ulloasp.mlsuite.organization.services.OrganizationAccessService;
import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import dev.ulloasp.mlsuite.security.identity.CurrentUserResolver;
import dev.ulloasp.mlsuite.user.dto.UserDto;
import dev.ulloasp.mlsuite.user.entity.User;
import dev.ulloasp.mlsuite.user.exceptions.UserAlreadyExistsException;
import dev.ulloasp.mlsuite.user.exceptions.UserDoesNotExistException;
import dev.ulloasp.mlsuite.user.service.UserService;
import dev.ulloasp.mlsuite.util.ErrorDto;
import jakarta.servlet.http.HttpServletRequest;

@RestController
public class UserControllerImpl implements UserController {

    private final CurrentUserResolver currentUserResolver;
    private final OrganizationAccessService organizationAccessService;
    private final UserService userService;

    public UserControllerImpl(
            CurrentUserResolver currentUserResolver,
            OrganizationAccessService organizationAccessService,
            UserService userService) {
        this.currentUserResolver = currentUserResolver;
        this.organizationAccessService = organizationAccessService;
        this.userService = userService;
    }

    public UserControllerImpl(CurrentUserResolver currentUserResolver, UserService userService) {
        this(currentUserResolver, null, userService);
    }

    @Override
    public ResponseEntity<UserDto> getProfile(Authentication authentication)
            throws UserDoesNotExistException {
        CurrentUser currentUser = organizationAccessService != null
                ? currentUserResolver.resolveProfile(authentication)
                : currentUserResolver.resolve(authentication);
        User user = userService.getProfile(currentUser.userId());

        return ResponseEntity.ok(UserDto.toDto(
                user,
                currentUser,
                organizationAccessService != null ? organizationAccessService.listActiveOrganizations(user) : java.util.List.of()));
    }

    @ExceptionHandler(UserDoesNotExistException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ResponseEntity<ErrorDto> handleUserDoesNotExistException(UserDoesNotExistException e,
            HttpServletRequest req) {
        ErrorDto dto = ErrorDto.of(HttpStatus.NOT_FOUND.value(), e.getMessage(), req.getRequestURI());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(dto);
    }

    @ExceptionHandler(UserAlreadyExistsException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ResponseEntity<ErrorDto> handleUserAlreadyExistsException(UserAlreadyExistsException e,
            HttpServletRequest req) {
        ErrorDto dto = ErrorDto.of(HttpStatus.CONFLICT.value(), e.getMessage(), req.getRequestURI());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(dto);
    }

}
