/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.user.application.service;

import dev.ulloasp.mlsuite.user.application.port.in.GetCurrentUserProfileUseCase;
import dev.ulloasp.mlsuite.user.application.port.in.SignInUserUseCase;
import dev.ulloasp.mlsuite.user.application.port.in.SignUpUserUseCase;
import dev.ulloasp.mlsuite.user.domain.model.OAuthProvider;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.user.domain.exception.UserAlreadyExistsException;
import dev.ulloasp.mlsuite.user.domain.exception.UserDoesNotExistException;

/**
 * Service interface for User entity operations. Contains business logic for
 * user management.
 */
public interface UserService extends SignUpUserUseCase, SignInUserUseCase, GetCurrentUserProfileUseCase {

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

        User getProfile(Long userId) throws UserDoesNotExistException;
}

