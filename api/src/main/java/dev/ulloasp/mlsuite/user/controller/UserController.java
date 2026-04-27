/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.user.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

import dev.ulloasp.mlsuite.user.dto.UserDto;
import dev.ulloasp.mlsuite.user.exceptions.UserDoesNotExistException;

@RequestMapping("/api/user")
public interface UserController {

    @GetMapping("/profile")
    public ResponseEntity<UserDto> getProfile(Authentication authentication)
            throws UserDoesNotExistException;
}
