import { useState } from "react";
import { AppCombobox } from "@/shared/ui/AppCombobox";
import { catalogRemoteProps } from "@/shared/ui/catalog/catalogRemoteProps";
import { useMemberRoleCatalog } from "@/features/workspace/api/workspace-catalog-queries";
import type { RoleSummaryDto } from "@/shared/api/openapi.gen";
export function MemberRoleSelect({
  organizationId,
  memberId,
  name,
  role,
  onChange,
}: {
  organizationId: number;
  memberId: number;
  name: string;
  role: RoleSummaryDto;
  onChange: (id: number) => void;
}) {
  const [search, setSearch] = useState("");
  const [enabled, setEnabled] = useState(false);
  const query = useMemberRoleCatalog(organizationId, memberId, search, enabled);
  return (
    <AppCombobox
      {...catalogRemoteProps(query, (next) => {
        setEnabled(true);
        setSearch(next);
      })}
      placeholder="Search role"
      aria-label={`Role for ${name}`}
      value={role.id ?? null}
      selectedItem={role.id ? { id: role.id, label: role.name } : undefined}
      items={(query.data?.items ?? []).flatMap((item) =>
        item.id ? [{ id: item.id, label: item.name }] : [],
      )}
      onChange={(item) => {
        if (item && item.id !== role.id) onChange(item.id);
      }}
    />
  );
}
