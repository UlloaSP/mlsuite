import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { useUser } from "@/capabilities/workspace-context/session";
import {
  notificationCatalogKey,
  PENDING_INVITATIONS_QUERY_KEY,
  useUnreadNotificationCount,
} from "@/features/notifications/api/notification.queries";
import { getNotifications } from "@/features/notifications/api/notifications.api";
import { presentNotification } from "./notification-presentation";

/** More than this at once is a backlog, which the badge tells better than a stack of toasts. */
const MOST_TOASTS = 3;

/** While the app is open, what arrives shows a toast and refreshes the inbox. */
export function useNotificationToasts() {
  const { data: unread } = useUnreadNotificationCount();
  const userId = useUser().data?.id;
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const seen = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (unread === undefined) return;
    const previous = seen.current;
    seen.current = unread;
    if (previous === undefined || unread <= previous) return;
    void queryClient.invalidateQueries({ queryKey: notificationCatalogKey(userId) });
    void queryClient.invalidateQueries({ queryKey: PENDING_INVITATIONS_QUERY_KEY });
    void getNotifications(0, "unread", Math.min(unread - previous, MOST_TOASTS)).then(
      ({ items }) => {
        for (const notification of items) {
          const { title, description } = presentNotification(notification);
          toast(title, {
            description,
            action: { label: "View", onClick: () => void navigate("/notifications") },
          });
        }
      },
      // The badge already counted it; a toast is not worth reporting a failed read.
      () => undefined,
    );
  }, [navigate, queryClient, unread, userId]);
}
