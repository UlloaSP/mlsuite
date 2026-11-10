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
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;

/** A person's own avatar, replaced or removed by them alone, in {@link UserProfileService}'s transaction. */
@Service
@RequiredArgsConstructor
class UserAvatarService {

    private final UserRepository userRepository;
    private final UserAvatarRepository avatarRepository;
    private final AuditLogService auditLog;
    private final EntityManager entityManager;

    UserDto replace(Long userId, MultipartFile upload) {
        User user = require(userId);
        SquareImage.Normalized avatar = SquareImage.normalize(upload, "picture");
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        avatarRepository.findByUserId(userId).ifPresentOrElse(
                stored -> stored.replace(avatar.content(), avatar.contentType(), now),
                () -> avatarRepository.save(new UserAvatar(userId, avatar.content(), avatar.contentType(), now)));
        auditLog.record(AuditActor.user(userId), null, AuditAction.USER_AVATAR_REPLACE, userId);
        return UserDto.toDto(reread(user));
    }

    UserDto remove(Long userId) {
        User user = require(userId);
        if (avatarRepository.deleteByUserId(userId) > 0) {
            auditLog.record(AuditActor.user(userId), null, AuditAction.USER_AVATAR_REMOVE, userId);
        }
        return UserDto.toDto(reread(user));
    }

    /** The avatar's time is read from the avatar row, so the user is read again once it is written. */
    private User reread(User user) {
        entityManager.flush();
        entityManager.refresh(user);
        return user;
    }

    private User require(Long userId) {
        return userRepository.findById(userId).orElseThrow(() -> new UserDoesNotExistException(userId));
    }
}
