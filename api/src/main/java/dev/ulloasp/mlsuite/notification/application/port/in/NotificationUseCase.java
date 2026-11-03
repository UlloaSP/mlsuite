package dev.ulloasp.mlsuite.notification.application.port.in;

import dev.ulloasp.mlsuite.notification.application.dto.NotificationDto;
import dev.ulloasp.mlsuite.notification.application.dto.UnreadNotificationCountDto;
import dev.ulloasp.mlsuite.util.CatalogRequest;
import dev.ulloasp.mlsuite.util.PageDto;

/** A member's own inbox; another member's notifications do not exist for them. */
public interface NotificationUseCase {

    PageDto<NotificationDto> catalog(Long userId, CatalogRequest request);

    UnreadNotificationCountDto unreadCount(Long userId);

    void markRead(Long userId, Long notificationId);

    void markAllRead(Long userId);

    void delete(Long userId, Long notificationId);

    void deleteRead(Long userId);
}
