package dev.ulloasp.mlsuite.user.application.port.in;

import java.util.Optional;

import jakarta.annotation.Nullable;

import dev.ulloasp.mlsuite.schema.application.dto.PublicBookmarkSummaryDto;
import dev.ulloasp.mlsuite.user.application.dto.PublicProfileDto;
import dev.ulloasp.mlsuite.user.domain.model.UserAvatar;
import dev.ulloasp.mlsuite.util.PageDto;

/** People as anyone may read them. A handle whose profile may not be read answers empty. */
public interface PublicProfileUseCase {

    Optional<PublicProfileDto> profile(String handle);

    Optional<PageDto<PublicBookmarkSummaryDto>> bookmarks(String handle, int page, int size);

    /**
     * A person's avatar, for a viewer with a reason to see it ({@code viewerId} null without a
     * session); empty for anyone else, as for a person without one.
     */
    Optional<UserAvatar> avatar(Long userId, @Nullable Long viewerId);
}
