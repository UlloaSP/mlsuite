package dev.ulloasp.mlsuite.admin;

import java.util.List;

public record AdminUserPageDto(
        List<AdminUserDto> items,
        long totalItems,
        boolean hasNext) {
}
