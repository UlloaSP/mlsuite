import { AppPage } from "@/shared/ui/AppPage";
import { AppPageHeader } from "@/shared/ui/PageHeader";
import { AppSurface } from "@/shared/ui/AppSurface";
import { CatalogListPanel } from "@/shared/ui/catalog/CatalogListPanel";
import { usePendingInvitationCatalog } from "@/features/workspace/api/workspace-catalog-queries";
import { NotificationInvitationItem } from "@/features/workspace/components/NotificationInvitationItem";
export function NotificationsPage() {
  const query = usePendingInvitationCatalog("");
  return (
    <AppPage>
      <AppSurface className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden">
        <AppPageHeader
          breadcrumbScope="account"
          breadcrumbs={[{ label: "Notifications" }]}
          eyebrow="Account"
          title="Notifications"
          description="Pending invitations and account-level updates."
        />
        <CatalogListPanel
          itemCount={query.data?.items.length ?? 0}
          hasNext={query.hasNextPage}
          isLoading={query.isLoading}
          isBusy={query.isFetching}
          loadingLabel="Loading notifications…"
          errorMessage={query.error?.message ?? null}
          onLoadMore={() => query.fetchNextPage()}
          onRetry={() =>
            void (query.isFetchNextPageError ? query.fetchNextPage() : query.refetch())
          }
          emptyState={{
            title: "No notifications",
            description: "New invitations and account updates will appear here.",
          }}
        >
          {query.data?.items.map((invitation) => (
            <NotificationInvitationItem key={invitation.id} invitation={invitation} />
          ))}
        </CatalogListPanel>
      </AppSurface>
    </AppPage>
  );
}
