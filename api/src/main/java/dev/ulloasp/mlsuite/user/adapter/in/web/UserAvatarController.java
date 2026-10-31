package dev.ulloasp.mlsuite.user.adapter.in.web;

import java.time.Duration;

import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import dev.ulloasp.mlsuite.user.application.dto.UserDto;
import dev.ulloasp.mlsuite.user.application.port.in.PublicProfileUseCase;
import dev.ulloasp.mlsuite.user.application.port.in.UserProfileUseCase;
import lombok.RequiredArgsConstructor;

/**
 * Replacing and removing the avatar are a person's own; reading it is open under /api/public,
 * which SecurityConfig permits to anyone, because public pages show it.
 */
@RestController
@RequiredArgsConstructor
public class UserAvatarController {

    private final UserProfileUseCase profiles;
    private final PublicProfileUseCase publicProfiles;

    @PutMapping(value = "/api/users/me/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<UserDto> replace(CurrentUser user, @RequestParam MultipartFile avatar) {
        return ResponseEntity.ok(profiles.replaceAvatar(user.userId(), avatar));
    }

    @DeleteMapping("/api/users/me/avatar")
    public ResponseEntity<UserDto> remove(CurrentUser user) {
        return ResponseEntity.ok(profiles.removeAvatar(user.userId()));
    }

    /** The address carries the avatar's version, so a browser may keep the bytes for good. */
    @GetMapping("/api/public/users/{userId}/avatar")
    public ResponseEntity<byte[]> read(@PathVariable Long userId) {
        return publicProfiles.avatar(userId)
                .map(avatar -> ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(avatar.getContentType()))
                        .cacheControl(CacheControl.maxAge(Duration.ofDays(365)).cachePublic().immutable())
                        .body(avatar.getContent()))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
