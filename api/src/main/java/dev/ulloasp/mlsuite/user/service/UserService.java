/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.user.service;

import dev.ulloasp.mlsuite.user.entity.User;
import dev.ulloasp.mlsuite.user.exceptions.UserDoesNotExistException;

/**
 * Service interface for User entity operations. Contains business logic for
 * user management.
 */
public interface UserService {

        User getProfile(Long userId) throws UserDoesNotExistException;
}
