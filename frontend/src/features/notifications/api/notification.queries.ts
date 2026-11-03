import { queryOptions, useQuery } from "@tanstack/react-query";
import { useUser } from "@/capabilities/workspace-context/session";
import { useInfiniteCatalog } from "@/shared/api/infinite-catalog";
import {
  getNotifications,
  getPendingInvitations,
  getUnreadNotificationCount,
  NOTIFICATION_PAGE_SIZE,
  type NotificationFilter,
} from "./notifications.api";

/**
 * The API pushes every new notification to the member's open tabs (useUserEvents); this slow
 * read only catches what a socket that never came back would miss.
 */
const UNREAD_SAFETY_POLL_MS = 5 * 60_000;

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
export const unreadNotificationCountQueryOptions = (userId: number | undefined) =>
  queryOptions({
    queryKey: [...NOTIFICATIONS_QUERY_KEY, userId, "unread-count"],
    queryFn: ({ signal }) => getUnreadNotificationCount(signal),
    select: (unread) => unread.count,
    enabled: userId !== undefined,
    staleTime: 0,
    refetchInterval: UNREAD_SAFETY_POLL_MS,
    // A missed poll is not worth an error: the badge keeps its last count until the next one.
    meta: { errorHandledLocally: true },
  });

export const useUnreadNotificationCount = () =>
  useQuery(unreadNotificationCountQueryOptions(useUser().data?.id));

/**
 * Invitations waiting for this account's answer, whatever became of what announced them. Every
 * invitation is announced by a notification, so they are read again whenever the unread count
 * changes (useNotificationToasts) rather than polled.
 */
export const pendingInvitationsQueryOptions = (userId: number | undefined) =>
  queryOptions({
    queryKey: [...PENDING_INVITATIONS_QUERY_KEY, userId],
    queryFn: ({ signal }) => getPendingInvitations(signal),
    select: (pending) => pending.items,
    enabled: userId !== undefined,
    staleTime: 0,
    meta: { errorHandledLocally: true },
  });

export const usePendingInvitations = () =>
  useQuery(pendingInvitationsQueryOptions(useUser().data?.id));
