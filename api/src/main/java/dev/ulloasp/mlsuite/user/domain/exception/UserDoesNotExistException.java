/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.user.domain.exception;

/**
 * Exception thrown when looking for a user that does not exist.
 */
public class UserDoesNotExistException extends RuntimeException {

    public UserDoesNotExistException(String email) {
        super("User with email '" + email + "' does not exist");
    }

    public UserDoesNotExistException(Long userId) {
        super("User with ID '" + userId + "' does not exist");
    }

}

