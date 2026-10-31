import { useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { useCurrentOrganizationId } from "@/capabilities/workspace-context/workspace-context";
import { isHttpError } from "@/shared/api/http";
import type { NotificationDto } from "@/shared/api/openapi.gen";
import { useMarkNotificationRead } from "@/features/notifications/api/notification.mutations";
import { notificationLink } from "./notification-presentation";

export type SelectOrganization = (organizationId: number) => Promise<unknown>;

/**
 * Opens what a notification is about, in its organization. The page there says when the target
 * itself is gone; an organization the member cannot enter any more is told here, on the row.
 */
export function useOpenNotification(selectOrganization: SelectOrganization) {
  const currentOrganizationId = useCurrentOrganizationId();
  const navigate = useNavigate();
  const { mutate: markRead } = useMarkNotificationRead();
  const [unavailable, setUnavailable] = useState<ReadonlySet<number>>(new Set());

  const open = async (notification: NotificationDto) => {
    const { id, organizationId, readAt } = notification;
    const to = notificationLink(notification);
    if (readAt === null) markRead(id);
    if (to === null) return;
    try {
      if (organizationId !== null && organizationId !== currentOrganizationId) {
        await selectOrganization(organizationId);
      }
      await navigate(to);
    } catch (error) {
      if (isHttpError(error) && [403, 404].includes(error.status)) {
        setUnavailable((ids) => new Set(ids).add(id));
      } else {
        toast.error(error instanceof Error ? error.message : String(error));
      }
    }
  };

  return { open, unavailable };
}
