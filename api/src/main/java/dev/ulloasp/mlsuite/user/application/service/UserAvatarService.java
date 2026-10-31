package dev.ulloasp.mlsuite.user.application.service;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import dev.ulloasp.mlsuite.audit.application.service.AuditLogService;
import dev.ulloasp.mlsuite.audit.domain.model.AuditAction;
import dev.ulloasp.mlsuite.audit.domain.model.AuditActor;
import dev.ulloasp.mlsuite.user.adapter.out.persistence.repository.UserAvatarRepository;
import dev.ulloasp.mlsuite.user.adapter.out.persistence.repository.UserRepository;
import dev.ulloasp.mlsuite.user.application.dto.UserDto;
import dev.ulloasp.mlsuite.user.domain.exception.UserDoesNotExistException;
import dev.ulloasp.mlsuite.user.domain.model.User;
import dev.ulloasp.mlsuite.user.domain.model.UserAvatar;
import dev.ulloasp.mlsuite.util.SquareImage;
import lombok.RequiredArgsConstructor;

/** A person's own avatar, replaced or removed by them alone, in {@link UserProfileService}'s transaction. */
@Service
@RequiredArgsConstructor
class UserAvatarService {

    private final UserRepository userRepository;
    private final UserAvatarRepository avatarRepository;
    private final AuditLogService auditLog;

    UserDto replace(Long userId, MultipartFile upload) {
        User user = require(userId);
        SquareImage.Normalized avatar = SquareImage.normalize(upload, "picture");
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        avatarRepository.save(new UserAvatar(userId, avatar.content(), avatar.contentType(), now));
        user.setAvatarUpdatedAt(now);
        auditLog.record(AuditActor.user(userId), null, AuditAction.USER_AVATAR_REPLACE, userId);
        return UserDto.toDto(user);
    }

    UserDto remove(Long userId) {
        User user = require(userId);
        if (user.getAvatarUpdatedAt() != null) {
            avatarRepository.deleteById(userId);
            user.setAvatarUpdatedAt(null);
            auditLog.record(AuditActor.user(userId), null, AuditAction.USER_AVATAR_REMOVE, userId);
        }
        return UserDto.toDto(user);
    }

    private User require(Long userId) {
        return userRepository.findById(userId).orElseThrow(() -> new UserDoesNotExistException(userId));
    }
}
