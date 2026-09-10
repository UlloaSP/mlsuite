import { useUser } from "@/capabilities/workspace-context/session";
import { useAdminUsers } from "@/features/admin/api/admin-user.queries";
import { CreateOrganizationPage } from "@/features/workspace/pages/create-organization-page";

export function CreateOrganizationRoute() {
  const { data: user } = useUser();
  const { data: usersPage } = useAdminUsers();
  return (
    <CreateOrganizationPage
      currentUserId={user ? Number(user.id) : undefined}
      users={usersPage?.items ?? []}
    />
  );
}
