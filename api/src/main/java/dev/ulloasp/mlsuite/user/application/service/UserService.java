/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.user.application.service;

import dev.ulloasp.mlsuite.user.application.port.in.GetCurrentUserProfileUseCase;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.user.domain.exception.UserDoesNotExistException;

/**
 * Service interface for User entity operations. Contains business logic for
 * user management.
 */
public interface UserService extends GetCurrentUserProfileUseCase {
        User getProfile(Long userId) throws UserDoesNotExistException;
}

