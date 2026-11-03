package dev.ulloasp.mlsuite.user.application.port.in;

import java.util.List;

import org.springframework.web.multipart.MultipartFile;

import dev.ulloasp.mlsuite.schema.application.dto.PublicBookmarkSummaryDto;
import dev.ulloasp.mlsuite.user.application.dto.OwnProfileDto;
import dev.ulloasp.mlsuite.user.application.dto.UpdateUserProfileRequest;
import dev.ulloasp.mlsuite.user.application.dto.UserDto;
import dev.ulloasp.mlsuite.util.PageDto;

/** What a person does to their own profile, and reads of it whether or not it is public. */
public interface UserProfileUseCase {

    UserDto update(Long userId, UpdateUserProfileRequest request);

    UserDto replaceAvatar(Long userId, MultipartFile upload);

    UserDto removeAvatar(Long userId);

    OwnProfileDto replacePins(Long userId, List<String> publicIds);

    OwnProfileDto ownProfile(Long userId);

    PageDto<PublicBookmarkSummaryDto> ownBookmarks(Long userId, int page, int size, String search);
}
