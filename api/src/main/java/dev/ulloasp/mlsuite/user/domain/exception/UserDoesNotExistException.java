/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.user.domain.exception;

/**
 * Exception thrown when looking for a user that does not exist.
 */
public class UserDoesNotExistException extends RuntimeException {

    public UserDoesNotExistException(String provider, String oauthId) {
        super("User with OAuth provider '" + provider + "' and ID '" + oauthId + "' does not exist");
    }

    public UserDoesNotExistException(Long userId) {
        super("User with ID '" + userId + "' does not exist");
    }

}

