import { Bell } from "lucide-react";
import { AppCopy } from "../../app/components/AppCopy";
import { AppEmptyState } from "../../app/components/AppEmptyState";
import { AppPage } from "../../app/components/AppPage";
import { AppPageHeader } from "../../app/components/PageHeader";
import { AppPanel } from "../../app/components/AppPanel";
import { AppSurface } from "../../app/components/AppSurface";
import { usePendingInvitations } from "../../api/workspace/hooks";
import { NotificationInvitationItem } from "../components/NotificationInvitationItem";

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
