package dev.ulloasp.mlsuite.notification.application.service;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Map;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import dev.ulloasp.mlsuite.notification.adapter.out.persistence.repository.NotificationRepository;
import dev.ulloasp.mlsuite.notification.application.dto.NotificationDto;
import dev.ulloasp.mlsuite.notification.application.dto.UnreadNotificationCountDto;
import dev.ulloasp.mlsuite.notification.application.port.in.NotificationUseCase;
import dev.ulloasp.mlsuite.notification.domain.exception.NotificationNotFoundException;
import dev.ulloasp.mlsuite.notification.domain.model.Notification;
import dev.ulloasp.mlsuite.notification.domain.model.NotificationKind;
import dev.ulloasp.mlsuite.notification.domain.model.NotificationTargetType;
import dev.ulloasp.mlsuite.util.CatalogPages;
import dev.ulloasp.mlsuite.util.CatalogRequest;
import dev.ulloasp.mlsuite.util.PageDto;
import lombok.RequiredArgsConstructor;

/**
 * Tells a person what happened, in the transaction of the transition it reports: a rollback leaves
 * no notification, and a caller that wins a transition once writes one. Everything a member does
 * with their inbox is limited to their own rows by the queries themselves.
 */
@Service
@RequiredArgsConstructor
public class NotificationService implements NotificationUseCase {

    private static final Sort NEWEST_FIRST = Sort.by(Sort.Direction.DESC, "id");

    private final NotificationRepository notifications;

    /**
     * Writes one notification. {@code organizationId} is null for one about the platform itself;
     * {@code targetId} is the id of what {@code kind.targetType()} names; {@code payload} holds the
     * labels that draw it (see NotificationKind). Fails without a surrounding transaction.
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public void notify(Long recipientUserId, Long organizationId, NotificationKind kind, String targetId,
            Map<String, Object> payload) {
        notifications.save(new Notification(recipientUserId, organizationId, kind, targetId, payload));
    }

    /** What told the recipient about the target was dealt with: it stops counting as unread. */
    @Transactional(propagation = Propagation.MANDATORY)
    public void markTargetRead(Long recipientUserId, NotificationTargetType targetType, String targetId) {
        notifications.markTargetRead(recipientUserId, targetType, targetId, now());
    }

    /** Newest first; {@code filter} is {@code unread} or, by default, everything. */
    @Override
    @Transactional(readOnly = true)
    public PageDto<NotificationDto> catalog(Long userId, CatalogRequest request) {
        Page<Notification> page = notifications.findCatalog(userId, "unread".equalsIgnoreCase(request.filter()),
                CatalogPages.pageable(request, NEWEST_FIRST));
        return PageDto.of(page, page.getContent().stream().map(NotificationDto::from).toList());
    }

    @Override
    @Transactional(readOnly = true)
    public UnreadNotificationCountDto unreadCount(Long userId) {
        return new UnreadNotificationCountDto(notifications.countByRecipientUserIdAndReadAtIsNull(userId));
    }

    @Override
    @Transactional
    public void markRead(Long userId, Long notificationId) {
        if (notifications.markRead(notificationId, userId, now()) == 0) {
            throw new NotificationNotFoundException(notificationId);
        }
    }

    @Override
    @Transactional
    public void markAllRead(Long userId) {
        notifications.markAllRead(userId, now());
    }

    @Override
    @Transactional
    public void delete(Long userId, Long notificationId) {
        if (notifications.deleteOwn(notificationId, userId) == 0) {
            throw new NotificationNotFoundException(notificationId);
        }
    }

    @Override
    @Transactional
    public void deleteRead(Long userId) {
        notifications.deleteRead(userId);
    }

    private static OffsetDateTime now() {
        return OffsetDateTime.now(ZoneOffset.UTC);
    }
}
