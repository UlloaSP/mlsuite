import { useState } from "react";
import { useUser } from "@/capabilities/workspace-context/session";
import { useOwnerCandidateCatalog } from "@/features/admin/api/admin-user.queries";
import { CreateOrganizationPage } from "@/features/workspace/pages/create-organization-page";
import { catalogRemoteProps } from "@/shared/ui/catalog/catalogRemoteProps";
export function CreateOrganizationRoute() {
  const { data: user } = useUser();
  const [search, setSearch] = useState("");
  const query = useOwnerCandidateCatalog(search);
  return (
    <CreateOrganizationPage
      initialOwner={
        user
          ? {
              id: Number(user.id),
              fullName: user.fullName,
              email: user.email,
              avatarUrl: user.avatarUrl,
              enabled: true,
            }
          : undefined
      }
      users={query.data?.items ?? []}
      remote={catalogRemoteProps(query, setSearch)}
    />
  );
}
