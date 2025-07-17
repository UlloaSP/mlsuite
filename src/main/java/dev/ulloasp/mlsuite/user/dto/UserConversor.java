package dev.ulloasp.mlsuite.user.dto;

import java.time.OffsetDateTime;

import dev.ulloasp.mlsuite.user.entity.OAuthProvider;
import dev.ulloasp.mlsuite.user.entity.User;

public class UserConversor {

    private UserConversor() {
    }

    public static final UserDto toDto(User user) {
        return new UserDto(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getOauthProvider().toString(),
                user.getDisplayName(),
                user.getFullName(),
                user.getAvatarUrl(),
                user.getIsActive(),
                user.getCreatedAt()
        );
    }

    public static final User toEntity(UserDto userDto) {
        return new User(
                userDto.getUserName(),
                userDto.getEmail(),
                OAuthProvider.fromString(userDto.getOauthProvider()),
                userDto.getFullName(),
                userDto.getDisplayName(),
                userDto.getAvatarUrl(),
                userDto.getIsActive(),
                OffsetDateTime.parse(userDto.getCreatedAt())
        );
    }
}
