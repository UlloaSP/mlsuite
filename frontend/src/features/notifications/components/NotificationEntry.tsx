import { Check, Trash2 } from "lucide-react";
import { AppActionsMenu } from "@/shared/ui/AppActionsMenu";
import { AppBadge } from "@/shared/ui/AppBadge";
import { LiveRelativeTime } from "@/shared/ui/LiveRelativeTime";
import { CatalogEntry } from "@/shared/ui/catalog/CatalogEntry";
import { cx } from "@/shared/ui/cx";
import type { NotificationDto } from "@/shared/api/openapi.gen";
import {
  notificationLink,
  presentNotification,
  type NotificationTone,
} from "@/features/notifications/lib/notification-presentation";

const TILE: Record<NotificationTone, string> = {
  success: "bg-success-subtle text-success-fg",
  warning: "bg-warning-subtle text-warning-fg",
  danger: "bg-danger-subtle text-danger-fg",
  info: "bg-info-subtle text-info-fg",
};

type Props = {
  notification: NotificationDto;
  /** An invitation it announced can no longer be answered. */
  closed: boolean;
  /** Its organization can no longer be entered. */
  unavailable: boolean;
  onOpen: () => void;
  onRead: () => void;
  onDelete: () => void;
};

export function NotificationEntry({
  notification,
  closed,
  unavailable,
  onOpen,
  onRead,
  onDelete,
}: Props) {
  const { title, description, icon: Icon, tone } = presentNotification(notification);
  const organizationName = notification.payload.organizationName;
  const unread = notification.readAt === null;

  return (
    <CatalogEntry
      title={title}
      titleAccessory={
        <>
          {unread ? <AppBadge tone="accent">New</AppBadge> : null}
          {closed ? <AppBadge>No longer open</AppBadge> : null}
          {unavailable ? <AppBadge>No longer available</AppBadge> : null}
        </>
      }
      icon={
        <span className={cx("grid size-9 place-items-center rounded-control", TILE[tone])}>
          <Icon size={16} aria-hidden />
        </span>
      }
      description={description}
      metadata={
        <>
          {typeof organizationName === "string" ? <span>{organizationName}</span> : null}
          <LiveRelativeTime value={notification.createdAt} />
        </>
      }
      // Not a link: opening may first have to switch this tab's organization.
      onOpen={notificationLink(notification) && !unavailable ? onOpen : undefined}
      actions={
        <AppActionsMenu
          label={`Open actions for ${title}`}
          actions={[
            ...(unread
              ? [{ key: "read", label: "Mark as read", icon: Check, onSelect: onRead }]
              : []),
            {
              key: "delete",
              label: "Delete",
              icon: Trash2,
              tone: "danger" as const,
              onSelect: onDelete,
            },
          ]}
        />
      }
    />
  );
}
