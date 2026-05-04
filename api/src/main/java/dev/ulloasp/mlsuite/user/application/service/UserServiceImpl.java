/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.user.application.service;

import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceBootstrapService;
import dev.ulloasp.mlsuite.user.domain.model.OAuthProvider;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.user.domain.exception.UserAlreadyExistsException;
import dev.ulloasp.mlsuite.user.domain.exception.UserDoesNotExistException;
import dev.ulloasp.mlsuite.user.adapter.out.persistence.repository.UserRepository;

@Service
@Transactional
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final WorkspaceBootstrapService workspaceBootstrapService;

    public UserServiceImpl(UserRepository userRepository, WorkspaceBootstrapService workspaceBootstrapService) {
        this.userRepository = userRepository;
        this.workspaceBootstrapService = workspaceBootstrapService;
    }

    @Override
    public void signUp(String username, String email, OAuthProvider oauthProvider, String oauthId, String avatarUrl,
            String fullName) throws UserAlreadyExistsException {
        if (this.userRepository.existsByOauthProviderAndOauthId(oauthProvider, oauthId)) {
            throw new UserAlreadyExistsException(oauthProvider.toString(), oauthId);
        }

        User newUser = new User(username, email, oauthProvider, oauthId, avatarUrl, fullName);
        this.userRepository.save(newUser);
        workspaceBootstrapService.ensureCurrentOrganization(newUser);
    }

    @Override
    public void signIn(OAuthProvider oauthProvider, String oauthId) throws UserDoesNotExistException {
        User user = this.userRepository.findByOauthProviderAndOauthId(oauthProvider, oauthId).orElse(null);
        if (user == null) {
            throw new UserDoesNotExistException(oauthProvider.toString(), oauthId);
        }
        workspaceBootstrapService.ensureCurrentOrganization(user);
    }

    @Override
    public User getProfile(Long userId) throws UserDoesNotExistException {
        Optional<User> optionalUser = this.userRepository.findById(userId);
        if (optionalUser.isEmpty()) {
            throw new UserDoesNotExistException(userId);
        }

        workspaceBootstrapService.ensureCurrentOrganization(optionalUser.get());
        return optionalUser.get();

    }
}

