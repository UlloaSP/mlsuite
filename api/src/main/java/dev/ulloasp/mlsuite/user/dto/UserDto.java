/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

package dev.ulloasp.mlsuite.user.dto;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Set;

import dev.ulloasp.mlsuite.organization.dtos.OrganizationSummaryDto;
import dev.ulloasp.mlsuite.security.identity.CurrentUser;
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
    String fullName;
    String avatarUrl;
    String createdAt;
    boolean isSuperadmin;
    String activeOrganizationSlug;
    String activeOrganizationName;
    List<OrganizationSummaryDto> organizations;
    Set<String> permissions;

    public static UserDto toDto(User user, CurrentUser currentUser, List<OrganizationSummaryDto> organizations) {
        return new UserDto(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getFullName(),
                user.getAvatarUrl(),
                user.getCreatedAt().format(DateTimeFormatter.ofPattern("MMM, yyyy")),
                user.isSuperadmin(),
                currentUser.activeOrganizationSlug(),
                currentUser.activeOrganizationName(),
                organizations,
                currentUser.permissions());
    }
}
