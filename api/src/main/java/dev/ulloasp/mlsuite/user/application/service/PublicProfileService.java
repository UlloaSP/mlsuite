package dev.ulloasp.mlsuite.user.application.service;

import java.util.List;
import java.util.Locale;
import java.util.Optional;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.ulloasp.mlsuite.model.adapter.out.persistence.repository.ModelRepository;
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationRepository;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.plugin.adapter.out.persistence.repository.PluginMetadataRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.PredictionRunRepository;
import dev.ulloasp.mlsuite.schema.adapter.out.persistence.repository.SchemaRepository;
import dev.ulloasp.mlsuite.schema.application.dto.PublicBookmarkSummaryDto;
import dev.ulloasp.mlsuite.schema.application.port.in.PublicBookmarkUseCase;
import dev.ulloasp.mlsuite.user.adapter.out.persistence.repository.UserAvatarRepository;
import dev.ulloasp.mlsuite.user.adapter.out.persistence.repository.UserRepository;
import dev.ulloasp.mlsuite.user.application.dto.OwnProfileDto;
import dev.ulloasp.mlsuite.user.application.dto.PublicProfileDto;
import dev.ulloasp.mlsuite.user.application.dto.PublicProfileOrganizationDto;
import dev.ulloasp.mlsuite.user.application.dto.UserAvatarUrl;
import dev.ulloasp.mlsuite.user.application.port.in.PublicProfileUseCase;
import dev.ulloasp.mlsuite.user.domain.exception.UserDoesNotExistException;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.user.domain.model.UserAvatar;
import dev.ulloasp.mlsuite.util.PageDto;
import lombok.RequiredArgsConstructor;

/**
 * Reads a profile. Like the public surface of bookmarks it never consults a session: a handle whose
 * owner is private, disabled, or unknown answers alike, so its existence cannot be probed. An
 * avatar is read by user id and not by handle, because it is also drawn beside their name on what
 * they published and in the organizations they work in.
 */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class PublicProfileService implements PublicProfileUseCase {

    /** As many as a profile lists; a person in more shows these. */
    private static final int MAX_ORGANIZATIONS = 24;

    private final UserRepository userRepository;
    private final UserAvatarRepository avatarRepository;
    private final OrganizationRepository organizationRepository;
    private final PublicBookmarkUseCase publicBookmarks;
    private final ModelRepository modelRepository;
    private final SchemaRepository schemaRepository;
    private final PluginMetadataRepository pluginRepository;
    private final PredictionRunRepository predictionRunRepository;

    @Override
    public Optional<PublicProfileDto> profile(String handle) {
        return visible(handle).map(this::dto);
    }

    @Override
    public Optional<PageDto<PublicBookmarkSummaryDto>> bookmarks(String handle, int page, int size) {
        return visible(handle).map(user -> publicBookmarks.getUnpinnedBookmarkPage(account(user).getId(), page, size, ""));
    }

    @Override
    public Optional<UserAvatar> avatar(Long userId) {
        return avatarRepository.findById(userId);
    }

    public OwnProfileDto own(Long userId) {
        User user = require(userId);
        Long accountId = account(user).getId();
        return new OwnProfileDto(dto(user),
                modelRepository.countByOrganizationId(accountId),
                schemaRepository.countByOrganizationId(accountId),
                pluginRepository.countByOrganizationId(accountId),
                predictionRunRepository.countByOrganizationId(accountId));
    }

    public PageDto<PublicBookmarkSummaryDto> ownBookmarks(Long userId, int page, int size, String search) {
        return publicBookmarks.getUnpinnedBookmarkPage(account(require(userId)).getId(), page, size, search);
    }

    private Optional<User> visible(String handle) {
        return userRepository.findByUsername(handle.toLowerCase(Locale.ROOT))
                .filter(user -> user.visibleHandle() != null);
    }

    private User require(Long userId) {
        return userRepository.findById(userId).orElseThrow(() -> new UserDoesNotExistException(userId));
    }

    private Organization account(User user) {
        return organizationRepository.findByOwnerUserId(user.getId()).orElseThrow();
    }

    private PublicProfileDto dto(User user) {
        return new PublicProfileDto(user.getUsername(), user.getFullName(), UserAvatarUrl.of(user), user.getBio(),
                user.getLocation(), user.getWebsite(), user.getCompany(), user.getProfileLinks(), user.getCreatedAt(),
                publicBookmarks.getPinnedBookmarks(user.getId()), organizations(user));
    }

    private List<PublicProfileOrganizationDto> organizations(User user) {
        if (!user.isProfileShowsOrganizations()) return List.of();
        return organizationRepository.findTeamsOfMember(user.getId(), PageRequest.of(0, MAX_ORGANIZATIONS)).stream()
                .map(PublicProfileOrganizationDto::from).toList();
    }
}
