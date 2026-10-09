import { useState } from "react";
import {
  useMemberFilterRole,
  useMemberFilterRoleCatalog,
} from "@/features/workspace/api/workspace-catalog-queries";
import { AppCombobox } from "@/shared/ui/AppCombobox";
import { catalogRemoteProps } from "@/shared/ui/catalog/catalogRemoteProps";

export function MemberRoleFilter({
  organizationId,
  value,
  onChange,
}: {
  organizationId: number;
  value: string;
  onChange: (value: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [enabled, setEnabled] = useState(false);
  const catalog = useMemberFilterRoleCatalog(organizationId, search, enabled);
  const selected = useMemberFilterRole(organizationId, value).data?.items[0];
  return (
    <AppCombobox
      {...catalogRemoteProps(catalog, (next) => {
        setEnabled(true);
        setSearch(next);
      })}
      aria-label="Filter by role"
      placeholder="All roles"
      value={value}
      selectedItem={
        value === "ALL"
          ? { id: "ALL", label: "All roles" }
          : selected?.id
            ? { id: String(selected.id), label: selected.name }
            : undefined
      }
      items={[
        ...(search ? [] : [{ id: "ALL", label: "All roles" }]),
        ...(catalog.data?.items ?? []).flatMap((role) =>
          role.id ? [{ id: String(role.id), label: role.name }] : [],
        ),
      ]}
      onChange={(item) => {
        if (item) onChange(item.id);
      }}
    />
  );
}
