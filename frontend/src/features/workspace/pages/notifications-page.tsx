import { Bell } from "lucide-react";
import { AppCopy } from "@/shared/ui/AppCopy";
import { AppEmptyState } from "@/shared/ui/AppEmptyState";
import { AppPage } from "@/shared/ui/AppPage";
import { AppPageHeader } from "@/shared/ui/PageHeader";
import { AppPanel } from "@/shared/ui/AppPanel";
import { AppSurface } from "@/shared/ui/AppSurface";
import { usePendingInvitations } from "@/features/workspace/api/workspace.queries";
import { NotificationInvitationItem } from "@/features/workspace/components/NotificationInvitationItem";

export function NotificationsPage() {
  const { data: invitations = [], isLoading } = usePendingInvitations();

  return (
    <AppPage>
      <AppSurface className="flex flex-1 flex-col gap-6 overflow-auto">
        <AppPageHeader
          eyebrow="Account"
          title="Notifications"
          description="Pending invitations and account-level updates."
        />
        {isLoading ? (
          <AppPanel className="rounded p-5">
            <AppCopy>Loading notifications...</AppCopy>
          </AppPanel>
        ) : invitations.length === 0 ? (
          <AppEmptyState
            icon={<Bell size={18} />}
            title="No notifications"
            description="New invitations and account updates will appear here."
            className="rounded"
          />
        ) : (
          <AppPanel className="overflow-hidden rounded p-0">
            {invitations.map((invitation) => (
              <NotificationInvitationItem key={invitation.id} invitation={invitation} />
            ))}
          </AppPanel>
        )}
      </AppSurface>
    </AppPage>
  );
}
