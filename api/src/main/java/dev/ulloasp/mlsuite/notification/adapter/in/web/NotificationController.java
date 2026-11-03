package dev.ulloasp.mlsuite.notification.adapter.in.web;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import dev.ulloasp.mlsuite.notification.application.dto.NotificationDto;
import dev.ulloasp.mlsuite.notification.application.dto.UnreadNotificationCountDto;
import dev.ulloasp.mlsuite.notification.application.port.in.NotificationUseCase;
import dev.ulloasp.mlsuite.security.identity.CurrentUser;
import dev.ulloasp.mlsuite.util.CatalogRequest;
import dev.ulloasp.mlsuite.util.PageDto;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationUseCase notifications;

    /** The signed-in member's notifications, newest first; {@code filter} is {@code unread} or {@code all}. */
    @GetMapping("/catalog")
    public PageDto<NotificationDto> catalog(CurrentUser user, @ModelAttribute CatalogRequest request) {
        return notifications.catalog(user.userId(), request);
    }

    @GetMapping("/unread-count")
    public UnreadNotificationCountDto unreadCount(CurrentUser user) {
        return notifications.unreadCount(user.userId());
    }

    @PostMapping("/{notificationId}/read")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markRead(CurrentUser user, @PathVariable Long notificationId) {
        notifications.markRead(user.userId(), notificationId);
    }

    @PostMapping("/read-all")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markAllRead(CurrentUser user) {
        notifications.markAllRead(user.userId());
    }

    @DeleteMapping("/{notificationId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(CurrentUser user, @PathVariable Long notificationId) {
        notifications.delete(user.userId(), notificationId);
    }

    /** Removes the notifications already read; unread ones stay. */
    @DeleteMapping("/read")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteRead(CurrentUser user) {
        notifications.deleteRead(user.userId());
    }
}
