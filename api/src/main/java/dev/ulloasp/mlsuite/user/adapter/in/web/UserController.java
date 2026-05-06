/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.user.adapter.in.web;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

import dev.ulloasp.mlsuite.user.application.dto.UserDto;
import dev.ulloasp.mlsuite.user.domain.exception.UserDoesNotExistException;

@RequestMapping("/api/users")
public interface UserController {

    @GetMapping("/me")
    public ResponseEntity<UserDto> getProfile(Authentication authentication)
            throws UserDoesNotExistException;
}

