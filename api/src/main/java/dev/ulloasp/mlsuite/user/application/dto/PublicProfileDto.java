package dev.ulloasp.mlsuite.user.application.dto;

import java.time.OffsetDateTime;
import java.util.List;

import dev.ulloasp.mlsuite.schema.application.dto.PublicBookmarkSummaryDto;

import jakarta.annotation.Nullable;

/**
 * A person as anyone may read them: what they wrote about themselves, what they pinned from what
 * they publish, and their organizations only if they chose to show them. It never holds an e-mail
 * or anything of a private bookmark; the rest of what they publish is read page by page.
 */
public record PublicProfileDto(
        String handle,
        String fullName,
        @Nullable String avatarUrl,
        @Nullable String bio,
        @Nullable String location,
        @Nullable String website,
        @Nullable String company,
        List<String> links,
        OffsetDateTime joinedAt,
        List<PublicBookmarkSummaryDto> pinned,
        List<PublicProfileOrganizationDto> organizations) {
}
