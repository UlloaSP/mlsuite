/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.user.adapter.in.web;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.RestController;

import dev.ulloasp.mlsuite.security.identity.CurrentUserResolver;
import dev.ulloasp.mlsuite.user.application.port.in.GetCurrentUserProfileUseCase;
import dev.ulloasp.mlsuite.user.application.dto.UserDto;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.user.domain.exception.UserDoesNotExistException;

@RestController
public class UserControllerImpl implements UserController {

    private final CurrentUserResolver currentUserResolver;
    private final GetCurrentUserProfileUseCase getCurrentUserProfileUseCase;

    public UserControllerImpl(
            CurrentUserResolver currentUserResolver,
            GetCurrentUserProfileUseCase getCurrentUserProfileUseCase) {
        this.currentUserResolver = currentUserResolver;
        this.getCurrentUserProfileUseCase = getCurrentUserProfileUseCase;
    }

    @Override
    public ResponseEntity<UserDto> getProfile(Authentication authentication)
            throws UserDoesNotExistException {
        User user = getCurrentUserProfileUseCase.getProfile(currentUserResolver.resolve(authentication).userId());
        return ResponseEntity.ok(UserDto.toDto(user));
    }
}

