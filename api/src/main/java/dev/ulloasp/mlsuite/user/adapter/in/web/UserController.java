/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.user.adapter.in.web;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.RestController;

import dev.ulloasp.mlsuite.security.identity.ClientNetworks;
import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import dev.ulloasp.mlsuite.user.application.dto.DeleteAccountRequest;
import dev.ulloasp.mlsuite.user.application.port.in.DeleteAccountUseCase;
import dev.ulloasp.mlsuite.user.application.port.in.GetCurrentUserProfileUseCase;
import dev.ulloasp.mlsuite.user.application.dto.UserDto;
import dev.ulloasp.mlsuite.user.domain.model.User;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/users")
public class UserController {

    private final GetCurrentUserProfileUseCase getCurrentUserProfileUseCase;
    private final DeleteAccountUseCase deleteAccountUseCase;
    private final ClientNetworks clientNetworks = new ClientNetworks();

    @GetMapping("/me")
    public ResponseEntity<UserDto> getProfile(CurrentUser user) {
        User profile = getCurrentUserProfileUseCase.getProfile(user.userId());
        return ResponseEntity.ok(UserDto.toDto(profile));
    }

    /** The account closes now, and this session with it; its purge runs on the server afterwards. */
    @DeleteMapping("/me")
    public ResponseEntity<Void> deleteAccount(CurrentUser user, @Valid @RequestBody DeleteAccountRequest request,
            HttpServletRequest servletRequest) {
        deleteAccountUseCase.deleteAccount(user.userId(), request.password(), clientNetworks.key(servletRequest));
        HttpSession session = servletRequest.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        SecurityContextHolder.clearContext();
        return ResponseEntity.noContent().build();
    }
}

