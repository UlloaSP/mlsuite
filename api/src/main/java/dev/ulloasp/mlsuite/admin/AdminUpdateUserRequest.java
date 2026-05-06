package dev.ulloasp.mlsuite.admin;

import jakarta.validation.constraints.Size;

public record AdminUpdateUserRequest(
        @Size(max = 150) String fullName,
        @Size(max = 50) String username,
        String systemRole,
        Boolean enabled) {
}
