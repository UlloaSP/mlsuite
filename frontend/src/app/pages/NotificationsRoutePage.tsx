import { NotificationsPage } from "@/features/notifications/pages/notifications-page";
import { useSelectOrganization } from "@/features/workspace/api/workspace.mutations";

/** The inbox, which enters an organization through the workspace feature to open its targets. */
export function NotificationsRoutePage() {
  const { mutateAsync } = useSelectOrganization({ errorHandledLocally: true });
  return <NotificationsPage selectOrganization={mutateAsync} />;
}
