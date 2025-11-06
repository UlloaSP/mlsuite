/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.user.service;

import dev.ulloasp.mlsuite.user.entity.OAuthProvider;
import dev.ulloasp.mlsuite.user.entity.User;
import dev.ulloasp.mlsuite.user.exceptions.UserAlreadyExistsException;
import dev.ulloasp.mlsuite.user.exceptions.UserDoesNotExistException;

/**
 * Service interface for User entity operations. Contains business logic for
 * user management.
 */
public interface UserService {

        /**
         * Signs up a new user with the provided details.
         *
         * @param username      the username of the user
         * @param email         the email of the user
         * @param oauthProvider the OAuth provider used for authentication
         * @param oauthId       the OAuth ID of the user
         * @param avatarUrl     the avatar URL of the user
         * @param fullName      the full name of the user
         * @throws UserAlreadyExistsException if a user with the same OAuth provider
         *                                    and ID already exists
         */
        void signUp(String username, String email, OAuthProvider oauthProvider, String oauthId, String avatarUrl,
                        String fullName)
                        throws UserAlreadyExistsException;

        /**
         * Signs in a user using the specified OAuth provider and OAuth ID.
         *
         * @param oauthProvider the OAuth provider used for authentication
         * @param oauthId       the unique OAuth ID of the user
         * @throws UserDoesNotExistException if a user with the given OAuth provider
         *                                   and ID does not exist
         */
        void signIn(OAuthProvider oauthProvider, String oauthId) throws UserDoesNotExistException;

        /**
         * Retrieves the profile of a user by their OAuth ID and OAuth provider.
         *
         * @param oauthId       the OAuth ID of the user
         * @param oauthProvider the OAuth provider of the user
         * @return the User entity
         * @throws UserDoesNotExistException if the user does not exist
         */
        User getProfile(String oauthId, OAuthProvider oauthProvider) throws UserDoesNotExistException;
}
