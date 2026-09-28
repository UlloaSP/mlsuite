import { Bell } from "lucide-react";
import { AppEmptyState } from "@/shared/ui/AppEmptyState";
import { AppPage } from "@/shared/ui/AppPage";
import { AppLoadingState } from "@/shared/ui/AppLoadingState";
import { useStableLoading } from "@/shared/ui/useStableLoading";
import { AppPageHeader } from "@/shared/ui/PageHeader";
import { AppPanel } from "@/shared/ui/AppPanel";
import { AppSurface } from "@/shared/ui/AppSurface";
import { usePendingInvitations } from "@/features/workspace/api/workspace.queries";
import { NotificationInvitationItem } from "@/features/workspace/components/NotificationInvitationItem";

export function NotificationsPage() {
  const { data: invitations = [], isLoading } = usePendingInvitations();
  const showLoader = useStableLoading(isLoading);

  return (
    <AppPage>
      <AppSurface className="flex flex-1 flex-col gap-6 overflow-auto">
        <AppPageHeader
          eyebrow="Account"
          title="Notifications"
          description="Pending invitations and account-level updates."
        />
        {showLoader ? (
          <AppLoadingState compact label="Loading notifications…" rows={3} />
        ) : invitations.length === 0 ? (
          <AppEmptyState
            icon={<Bell size={18} />}
            title="No notifications"
            description="New invitations and account updates will appear here."
          />
        ) : (
          <AppPanel className="overflow-hidden p-0">
            {invitations.map((invitation) => (
              <NotificationInvitationItem key={invitation.id} invitation={invitation} />
            ))}
          </AppPanel>
        )}
      </AppSurface>
    </AppPage>
  );
}
