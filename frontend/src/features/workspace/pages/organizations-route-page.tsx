import { useCurrentUserIsSuperadmin } from "@/capabilities/workspace-context/session";
import { OrganizationsPage } from "@/features/workspace/pages/organizations-page";
import { YourOrganizationsPage } from "@/features/workspace/pages/your-organizations-page";

/** A superadmin administers every organization; everyone else sees the ones they belong to. */
export function OrganizationsRoutePage() {
  return useCurrentUserIsSuperadmin() ? <OrganizationsPage /> : <YourOrganizationsPage />;
}
