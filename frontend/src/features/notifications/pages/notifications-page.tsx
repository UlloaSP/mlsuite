import { useSearchParamState } from "@/shared/lib/use-search-param-state";
import { AppButton } from "@/shared/ui/AppButton";
import { AppPage } from "@/shared/ui/AppPage";
import { AppSegmentedControl } from "@/shared/ui/AppSegmentedControl";
import { AppSurface } from "@/shared/ui/AppSurface";
import { AppPageHeader } from "@/shared/ui/PageHeader";
import { CatalogListPanel } from "@/shared/ui/catalog/CatalogListPanel";
import { useActionDialog } from "@/shared/ui/use-action-dialog";
import {
  useDeleteNotification,
  useDeleteReadNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
} from "@/features/notifications/api/notification.mutations";
import {
  useNotificationCatalog,
  usePendingInvitations,
  useUnreadNotificationCount,
} from "@/features/notifications/api/notification.queries";
import type { NotificationFilter } from "@/features/notifications/api/notifications.api";
import { NotificationEntry } from "@/features/notifications/components/NotificationEntry";
import { PendingInvitationEntry } from "@/features/notifications/components/PendingInvitationEntry";
import {
  useOpenNotification,
  type SelectOrganization,
} from "@/features/notifications/lib/use-open-notification";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
] as const;
const FILTER_VALUES: readonly NotificationFilter[] = ["all", "unread"];

const EMPTY = {
  all: {
    title: "No notifications",
    description:
      "Finished bulk uploads, prepared models, invitations and reviews assigned to you appear here.",
  },
  unread: { title: "Nothing unread", description: "You have read everything." },
};

/**
 * The inbox: what happened, with the invitations still waiting for an answer first. A waiting
 * invitation is a row of its own, and comes from the invitations themselves, so answering stays
 * possible whatever became of the notification that announced it. That notification joins the
 * history once the invitation is no longer waiting.
 */
export function NotificationsPage({
  selectOrganization,
}: {
  selectOrganization: SelectOrganization;
}) {
  const [filter, setFilter] = useSearchParamState<NotificationFilter>(
    "filter",
    "all",
    FILTER_VALUES,
  );
  const notifications = useNotificationCatalog(filter);
  const pending = usePendingInvitations();
  const unread = useUnreadNotificationCount().data ?? 0;
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const remove = useDeleteNotification();
  const removeRead = useDeleteReadNotifications();
  const { open, unavailable } = useOpenNotification(selectOrganization);
  const { confirm, dialog } = useActionDialog();

  const waiting = pending.data
    ? new Set(pending.data.map((invitation) => String(invitation.id)))
    : null;
  const isWaiting = (kind: string, targetId: string) =>
    kind === "INVITATION_RECEIVED" && Boolean(waiting?.has(targetId));
  const history = (notifications.data?.items ?? []).filter(
    ({ kind, targetId }) => !isWaiting(kind, targetId),
  );

  const confirmDelete = async (description: string, action: () => void) => {
    if (await confirm({ title: "Delete notifications", description, confirmLabel: "Delete" })) {
      action();
    }
  };

  return (
    <AppPage>
      <AppSurface className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden">
        <AppPageHeader
          breadcrumbs={[{ label: "Notifications" }]}
          title="Notifications"
          description="What happened while you were elsewhere, and the invitations waiting for your answer."
          actions={
            <>
              <AppButton
                variant="secondary"
                disabled={unread === 0 || markAllRead.isPending}
                onClick={() => markAllRead.mutate()}
              >
                Mark all read
              </AppButton>
              <AppButton
                variant="ghost"
                disabled={removeRead.isPending}
                onClick={() =>
                  void confirmDelete("Every notification you have read is removed.", () =>
                    removeRead.mutate(),
                  )
                }
              >
                Delete read
              </AppButton>
            </>
          }
        />
        <AppSegmentedControl
          size="md"
          label="Show notifications"
          options={FILTERS}
          value={filter}
          onChange={setFilter}
        />
        <CatalogListPanel
          itemCount={history.length + (pending.data?.length ?? 0)}
          hasNext={notifications.hasNextPage}
          isLoading={notifications.isLoading || pending.isLoading}
          isBusy={notifications.isFetching}
          loadingLabel="Loading notifications…"
          errorMessage={notifications.error?.message ?? pending.error?.message ?? null}
          onLoadMore={() => notifications.fetchNextPage()}
          onRetry={() => {
            if (pending.isError) void pending.refetch();
            if (notifications.isFetchNextPageError) void notifications.fetchNextPage();
            else if (notifications.isError) void notifications.refetch();
          }}
          emptyState={EMPTY[filter]}
        >
          {pending.data?.map((invitation) => (
            <PendingInvitationEntry key={`invitation-${invitation.id}`} invitation={invitation} />
          ))}
          {history.map((notification) => (
            <NotificationEntry
              key={notification.id}
              notification={notification}
              closed={notification.kind === "INVITATION_RECEIVED" && waiting !== null}
              unavailable={unavailable.has(notification.id)}
              onOpen={() => void open(notification)}
              onRead={() => markRead.mutate(notification.id)}
              onDelete={() =>
                void confirmDelete("This notification is removed.", () =>
                  remove.mutate(notification.id),
                )
              }
            />
          ))}
        </CatalogListPanel>
      </AppSurface>
      {dialog}
    </AppPage>
  );
}
