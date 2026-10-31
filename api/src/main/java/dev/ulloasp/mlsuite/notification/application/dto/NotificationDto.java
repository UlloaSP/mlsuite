package dev.ulloasp.mlsuite.notification.application.dto;

import java.time.OffsetDateTime;
import java.util.Map;

import dev.ulloasp.mlsuite.notification.domain.model.Notification;
import dev.ulloasp.mlsuite.notification.domain.model.NotificationKind;
import dev.ulloasp.mlsuite.notification.domain.model.NotificationTargetType;
import jakarta.annotation.Nullable;

public record NotificationDto(
        Long id,
        @Nullable Long organizationId,
        NotificationKind kind,
        NotificationTargetType targetType,
        String targetId,
        Map<String, Object> payload,
        @Nullable OffsetDateTime readAt,
        OffsetDateTime createdAt) {

    public static NotificationDto from(Notification notification) {
        return new NotificationDto(notification.getId(), notification.getOrganizationId(), notification.getKind(),
                notification.getTargetType(), notification.getTargetId(), notification.getPayload(),
                notification.getReadAt(), notification.getCreatedAt());
    }
}
