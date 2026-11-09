package dev.ulloasp.mlsuite.notification.application.service;

import java.util.List;
import java.util.Locale;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Map;

import org.springframework.context.ApplicationEventPublisher;
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
import dev.ulloasp.mlsuite.util.CatalogPages;
import dev.ulloasp.mlsuite.util.CatalogRequest;
import dev.ulloasp.mlsuite.util.CatalogValues;
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
    private final ApplicationEventPublisher events;

    /**
     * Writes one notification. {@code organizationId} is null for one about the platform itself;
     * {@code targetId} is the id of what {@code kind.targetType()} names; {@code payload} holds the
     * labels that draw it (see NotificationKind). Fails without a surrounding transaction; once it
     * commits, the recipient's open tabs are told (NotificationsChangedPush).
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public void notify(Long recipientUserId, Long organizationId, NotificationKind kind, String targetId,
            Map<String, Object> payload) {
        notifications.save(new Notification(recipientUserId, organizationId, kind, targetId, payload));
        events.publishEvent(new NotificationsChanged(recipientUserId));
    }

    /** What told someone about a target that no longer stands (a revoked invitation) is taken back. */
    @Transactional(propagation = Propagation.MANDATORY)
    public void withdraw(NotificationKind kind, String targetId) {
        List<Notification> told = notifications.findByKindAndTargetId(kind, targetId);
        notifications.deleteAll(told);
        told.stream().map(Notification::getRecipientUserId).distinct()
                .forEach(recipient -> events.publishEvent(new NotificationsChanged(recipient)));
    }

    /**
     * The recipient answered what they were told about (an invitation): what told them stops
     * counting as unread and keeps their answer under {@code answer}, for the inbox to show.
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public void recordAnswer(Long recipientUserId, NotificationKind kind, String targetId, String answer) {
        List<Notification> told = notifications.findByRecipientUserIdAndKindAndTargetId(recipientUserId, kind, targetId);
        OffsetDateTime at = now();
        told.forEach(notification -> notification.answer(answer, at));
        if (!told.isEmpty()) events.publishEvent(new NotificationsChanged(recipientUserId));
    }

    /** Newest first; {@code filter} is {@code unread} or {@code all}. */
    @Override
    @Transactional(readOnly = true)
    public PageDto<NotificationDto> catalog(Long userId, CatalogRequest request) {
        String filter = CatalogValues.require("filter",
                request.requireOneOrder().filter().toLowerCase(Locale.ROOT), List.of("all", "unread"));
        Page<Notification> page = notifications.findCatalog(userId, filter.equals("unread"),
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
