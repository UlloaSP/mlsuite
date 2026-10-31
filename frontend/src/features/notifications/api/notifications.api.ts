import { appFetch } from "@/shared/api/http";
import type { CatalogPage } from "@/shared/api/infinite-catalog";
import type {
  InvitationDto,
  NotificationDto,
  PageDtoNotificationDto,
  UnreadNotificationCountDto,
} from "@/shared/api/openapi.gen";

export const NOTIFICATION_PAGE_SIZE = 24;
/** The API's largest page: an account never has this many invitations waiting. */
const PENDING_INVITATIONS = 100;

export type NotificationFilter = "all" | "unread";
export type NotificationKind = NotificationDto["kind"];

export const getNotifications = (
  page: number,
  filter: NotificationFilter,
  size: number,
  signal?: AbortSignal,
): Promise<PageDtoNotificationDto> =>
  appFetch<PageDtoNotificationDto>(
    `/api/notifications/catalog?${new URLSearchParams({
      page: String(page),
      size: String(size),
      filter,
    })}`,
    { signal },
  );

export const getUnreadNotificationCount = (signal: AbortSignal) =>
  appFetch<UnreadNotificationCountDto>("/api/notifications/unread-count", { signal });

export const markNotificationRead = (id: number): Promise<void> =>
  appFetch<void>(`/api/notifications/${id}/read`, { method: "POST" });

export const markAllNotificationsRead = (): Promise<void> =>
  appFetch<void>("/api/notifications/read-all", { method: "POST" });

export const deleteNotification = (id: number): Promise<void> =>
  appFetch<void>(`/api/notifications/${id}`, { method: "DELETE" });

export const deleteReadNotifications = (): Promise<void> =>
  appFetch<void>("/api/notifications/read", { method: "DELETE" });

export const getPendingInvitations = (signal: AbortSignal) =>
  appFetch<CatalogPage<InvitationDto>>(
    `/api/invitations/pending/catalog?size=${PENDING_INVITATIONS}`,
    { signal },
  );

export const acceptInvitation = (invitationId: number): Promise<InvitationDto> =>
  appFetch<InvitationDto>(`/api/invitations/${invitationId}/accept`, { method: "POST" });

export const declineInvitation = (invitationId: number): Promise<void> =>
  appFetch<void>(`/api/invitations/${invitationId}/decline`, { method: "POST" });
