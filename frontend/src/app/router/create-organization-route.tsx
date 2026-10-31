import { useState } from "react";
import { useCurrentUserIsSuperadmin, useUser } from "@/capabilities/workspace-context/session";
import { useOwnerCandidateCatalog } from "@/features/admin/api/admin-user.queries";
import { CreateOrganizationPage } from "@/features/workspace/pages/create-organization-page";
import { catalogRemoteProps } from "@/shared/ui/catalog/catalogRemoteProps";

/** Anyone creates an organization and owns it; only a superadmin may give it another owner. */
export function CreateOrganizationRoute() {
  const { data: user } = useUser();
  const superadmin = useCurrentUserIsSuperadmin();
  const [search, setSearch] = useState("");
  const query = useOwnerCandidateCatalog(search, superadmin);
  return (
    <CreateOrganizationPage
      ownerChoice={
        superadmin
          ? {
              initialOwner: user && {
                id: Number(user.id),
                fullName: user.fullName,
                email: user.email,
                avatarUrl: user.avatarUrl,
                enabled: true,
              },
              users: query.data?.items ?? [],
              remote: catalogRemoteProps(query, setSearch),
            }
          : undefined
      }
    />
  );
}
