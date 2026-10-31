package dev.ulloasp.mlsuite.user.application.port.in;

import java.util.Optional;

import dev.ulloasp.mlsuite.schema.application.dto.PublicBookmarkSummaryDto;
import dev.ulloasp.mlsuite.user.application.dto.PublicProfileDto;
import dev.ulloasp.mlsuite.user.domain.model.UserAvatar;
import dev.ulloasp.mlsuite.util.PageDto;

/** People as anyone may read them. A handle whose profile may not be read answers empty. */
public interface PublicProfileUseCase {

    Optional<PublicProfileDto> profile(String handle);

    Optional<PageDto<PublicBookmarkSummaryDto>> bookmarks(String handle, int page, int size);

    Optional<UserAvatar> avatar(Long userId);
}
