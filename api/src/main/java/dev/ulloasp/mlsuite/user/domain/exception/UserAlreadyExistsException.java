/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.user.domain.exception;

/**
 * Exception thrown when trying to create a user that already exists.
 */
public class UserAlreadyExistsException extends RuntimeException {

    public UserAlreadyExistsException(String provider, String oauthId) {
        super("User already exists with OAuth provider '" + provider + "' and ID '" + oauthId + "'");
    }
}

