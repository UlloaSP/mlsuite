package dev.ulloasp.mlsuite.user.application.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import dev.ulloasp.mlsuite.audit.application.service.AuditLogService;
import dev.ulloasp.mlsuite.audit.domain.model.AuditAction;
import dev.ulloasp.mlsuite.audit.domain.model.AuditActor;
import dev.ulloasp.mlsuite.audit.domain.model.AuditDetails;
import dev.ulloasp.mlsuite.schema.application.dto.PublicBookmarkSummaryDto;
import dev.ulloasp.mlsuite.user.adapter.out.persistence.repository.UserRepository;
import dev.ulloasp.mlsuite.user.application.dto.OwnProfileDto;
import dev.ulloasp.mlsuite.user.application.dto.UpdateUserProfileRequest;
import dev.ulloasp.mlsuite.user.application.dto.UserDto;
import dev.ulloasp.mlsuite.user.application.port.in.UserProfileUseCase;
import dev.ulloasp.mlsuite.user.domain.exception.UserDoesNotExistException;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.util.PageDto;
import dev.ulloasp.mlsuite.workspace.application.service.PersonalAccountService;
import lombok.RequiredArgsConstructor;

/**
 * A person editing themselves. Their handle and name are also those of their personal account, so
 * both change together, in the transaction that edits the profile.
 */
@Service
@Transactional
@RequiredArgsConstructor
public class UserProfileService implements UserProfileUseCase {

    private final UserRepository userRepository;
    private final PersonalAccountService personalAccountService;
    private final UserAvatarService avatars;
    private final ProfilePinService pins;
    private final PublicProfileService publicProfiles;
    private final AuditLogService auditLog;

    @Override
    public UserDto update(Long userId, UpdateUserProfileRequest request) {
        User user = userRepository.findById(userId).orElseThrow(() -> new UserDoesNotExistException(userId));
        Editable before = Editable.of(user);
        String previousHandle = user.getUsername();
        apply(user, request);
        if (request.handle() != null) {
            personalAccountService.renameHandle(user, request.handle());
        }
        Editable after = Editable.of(user);
        boolean handleChanged = !previousHandle.equals(user.getUsername());
        if (handleChanged || !before.fullName().equals(after.fullName())) {
            personalAccountService.followOwner(user);
        }
        if (handleChanged) {
            auditLog.record(AuditActor.user(userId), null, AuditAction.USER_HANDLE_CHANGE, userId,
                    AuditDetails.of("handle", AuditDetails.changed(previousHandle, user.getUsername())));
        }
        Map<String, Object> changes = changes(before, after);
        if (!changes.isEmpty()) {
            auditLog.record(AuditActor.user(userId), null, AuditAction.USER_PROFILE_UPDATE, userId, changes);
        }
        return UserDto.toDto(user);
    }

    @Override
    public UserDto replaceAvatar(Long userId, MultipartFile upload) {
        return avatars.replace(userId, upload);
    }

    @Override
    public UserDto removeAvatar(Long userId) {
        return avatars.remove(userId);
    }

    @Override
    public OwnProfileDto replacePins(Long userId, List<String> publicIds) {
        pins.replace(userId, publicIds);
        return publicProfiles.own(userId);
    }

    @Override
    @Transactional(readOnly = true)
    public OwnProfileDto ownProfile(Long userId) {
        return publicProfiles.own(userId);
    }

    @Override
    @Transactional(readOnly = true)
    public PageDto<PublicBookmarkSummaryDto> ownBookmarks(Long userId, int page, int size, String search) {
        return publicProfiles.ownBookmarks(userId, page, size, search);
    }

    private static void apply(User user, UpdateUserProfileRequest request) {
        if (request.fullName() != null) {
            String name = ProfileText.line(request.fullName(), "The name");
            if (name == null) throw new IllegalArgumentException("The name cannot be empty.");
            user.setFullName(name);
        }
        if (request.bio() != null) user.setBio(ProfileText.lines(request.bio(), "The bio"));
        if (request.location() != null) user.setLocation(ProfileText.line(request.location(), "The location"));
        if (request.website() != null) user.setWebsite(ProfileText.url(request.website(), "The website"));
        if (request.company() != null) user.setCompany(ProfileText.line(request.company(), "The company"));
        if (request.links() != null) {
            user.setProfileLinks(new ArrayList<>(request.links().stream()
                    .map(link -> ProfileText.url(link, "A link")).filter(Objects::nonNull).distinct().toList()));
        }
        if (request.profilePublic() != null) user.setProfilePublic(request.profilePublic());
        if (request.profileShowsOrganizations() != null) {
            user.setProfileShowsOrganizations(request.profileShowsOrganizations());
        }
    }

    private static Map<String, Object> changes(Editable before, Editable after) {
        return AuditDetails.of(
                "name", AuditDetails.changed(before.fullName(), after.fullName()),
                "bio", AuditDetails.changed(before.bio(), after.bio()),
                "location", AuditDetails.changed(before.location(), after.location()),
                "website", AuditDetails.changed(before.website(), after.website()),
                "company", AuditDetails.changed(before.company(), after.company()),
                "links", AuditDetails.changed(before.links(), after.links()),
                "public", AuditDetails.changed(before.profilePublic(), after.profilePublic()),
                "showsOrganizations", AuditDetails.changed(before.showsOrganizations(), after.showsOrganizations()));
    }

    /** The values one edit may change, kept to tell afterwards what it did. */
    private record Editable(String fullName, String bio, String location, String website, String company,
            List<String> links, boolean profilePublic, boolean showsOrganizations) {

        static Editable of(User user) {
            return new Editable(user.getFullName(), user.getBio(), user.getLocation(), user.getWebsite(),
                    user.getCompany(), List.copyOf(user.getProfileLinks()), user.isProfilePublic(),
                    user.isProfileShowsOrganizations());
        }
    }
}
