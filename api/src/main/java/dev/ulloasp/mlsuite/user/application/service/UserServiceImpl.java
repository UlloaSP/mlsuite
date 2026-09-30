/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.user.application.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceBootstrapService;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.user.domain.exception.UserDoesNotExistException;
import dev.ulloasp.mlsuite.user.adapter.out.persistence.repository.UserRepository;
import dev.ulloasp.mlsuite.user.application.port.in.GetCurrentUserProfileUseCase;
import lombok.RequiredArgsConstructor;

@Service
@Transactional
@RequiredArgsConstructor
public class UserServiceImpl implements GetCurrentUserProfileUseCase {

    private final UserRepository userRepository;
    private final WorkspaceBootstrapService workspaceBootstrapService;

    @Override
    public User getProfile(Long userId) throws UserDoesNotExistException {
        User user = userRepository.findById(userId).orElseThrow(() -> new UserDoesNotExistException(userId));
        workspaceBootstrapService.ensureCurrentOrganization(user);
        return user;
    }
}

