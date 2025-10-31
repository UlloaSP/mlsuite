package dev.ulloasp.mlsuite.user.dto;

import java.time.format.DateTimeFormatter;

import dev.ulloasp.mlsuite.user.entity.User;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class UserDto {
    Long id;
    String userName;
    String email;
    String oauthProvider;
    String fullName;
    String avatarUrl;
    String createdAt;

    public static final UserDto toDto(User user) {
        return new UserDto(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getOauthProvider().toString(),
                user.getFullName(),
                user.getAvatarUrl(),
                user.getCreatedAt().format(DateTimeFormatter.ofPattern("MMM, yyyy")));
    }
}
