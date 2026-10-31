/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.user.adapter.in.web;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import dev.ulloasp.mlsuite.schema.application.dto.PublicBookmarkSummaryDto;
import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import dev.ulloasp.mlsuite.user.application.port.in.GetCurrentUserProfileUseCase;
import dev.ulloasp.mlsuite.user.application.port.in.UserProfileUseCase;
import dev.ulloasp.mlsuite.user.application.dto.OwnProfileDto;
import dev.ulloasp.mlsuite.user.application.dto.UpdateProfilePinsRequest;
import dev.ulloasp.mlsuite.user.application.dto.UpdateUserProfileRequest;
import dev.ulloasp.mlsuite.user.application.dto.UserDto;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.util.PageDto;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/users")
public class UserController {

    private final GetCurrentUserProfileUseCase getCurrentUserProfileUseCase;
    private final UserProfileUseCase profiles;

    @GetMapping("/me")
    public ResponseEntity<UserDto> getProfile(CurrentUser user) {
        User profile = getCurrentUserProfileUseCase.getProfile(user.userId());
        return ResponseEntity.ok(UserDto.toDto(profile));
    }

    @PatchMapping("/me")
    public ResponseEntity<UserDto> updateProfile(CurrentUser user, @Valid @RequestBody UpdateUserProfileRequest request) {
        return ResponseEntity.ok(profiles.update(user.userId(), request));
    }

    /** Their profile as anyone else would read it, whether or not it is public, and their own counts. */
    @GetMapping("/me/profile")
    public ResponseEntity<OwnProfileDto> ownProfile(CurrentUser user) {
        return ResponseEntity.ok(profiles.ownProfile(user.userId()));
    }

    /** What they publish beyond their pins, the same as the public listing, and searchable to pin it. */
    @GetMapping("/me/bookmarks")
    public ResponseEntity<PageDto<PublicBookmarkSummaryDto>> ownBookmarks(
            CurrentUser user,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "24") int size,
            @RequestParam(name = "search", defaultValue = "") String search) {
        return ResponseEntity.ok(profiles.ownBookmarks(user.userId(), page, size, search));
    }

    @PutMapping("/me/pins")
    public ResponseEntity<OwnProfileDto> replacePins(CurrentUser user, @Valid @RequestBody UpdateProfilePinsRequest request) {
        return ResponseEntity.ok(profiles.replacePins(user.userId(), request.publicIds()));
    }
}

