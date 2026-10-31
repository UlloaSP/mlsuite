import { useQuery } from "@tanstack/react-query";
import { useUser } from "@/capabilities/workspace-context/session";
import { useInfiniteCatalog } from "@/shared/api/infinite-catalog";
import {
  getNotifications,
  getPendingInvitations,
  getUnreadNotificationCount,
  NOTIFICATION_PAGE_SIZE,
  type NotificationFilter,
} from "./notifications.api";

/** How often the shell asks whether anything happened. */
const UNREAD_POLL_MS = 30_000;
const PENDING_POLL_MS = 60_000;

// A person's inbox follows them across organizations, so its keys name the user, not a tenant.
export const NOTIFICATIONS_QUERY_KEY = ["notifications"] as const;
export const PENDING_INVITATIONS_QUERY_KEY = ["pendingInvitations"] as const;

export const notificationCatalogKey = (userId: number | undefined) =>
  [...NOTIFICATIONS_QUERY_KEY, userId, "infinite"] as const;

export function useNotificationCatalog(filter: NotificationFilter) {
  const userId = useUser().data?.id;
  return useInfiniteCatalog({
    queryKey: [...notificationCatalogKey(userId), filter],
    queryFn: (page, signal) => getNotifications(page, filter, NOTIFICATION_PAGE_SIZE, signal),
    enabled: userId !== undefined,
    staleTime: 0,
    meta: { errorHandledLocally: true },
  });
}

/** The badge's count, which also tells the shell that something new arrived. */
export function useUnreadNotificationCount() {
  const userId = useUser().data?.id;
  return useQuery({
    queryKey: [...NOTIFICATIONS_QUERY_KEY, userId, "unread-count"],
    queryFn: ({ signal }) => getUnreadNotificationCount(signal),
    select: (unread) => unread.count,
    enabled: userId !== undefined,
    staleTime: 0,
    refetchInterval: UNREAD_POLL_MS,
    // A missed poll is not worth an error: the badge keeps its last count until the next one.
    meta: { errorHandledLocally: true },
  });
}

/** Invitations waiting for this account's answer, whatever became of what announced them. */
export function usePendingInvitations() {
  const userId = useUser().data?.id;
  return useQuery({
    queryKey: [...PENDING_INVITATIONS_QUERY_KEY, userId],
    queryFn: ({ signal }) => getPendingInvitations(signal),
    select: (pending) => pending.items,
    enabled: userId !== undefined,
    staleTime: 0,
    refetchInterval: PENDING_POLL_MS,
    meta: { errorHandledLocally: true },
  });
}
