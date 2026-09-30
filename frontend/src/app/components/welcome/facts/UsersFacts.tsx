/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useAdminUsers } from "@/features/admin/api/admin-user.queries";
import { FactList } from "@/app/components/welcome/FactList";

/** Platform accounts, and how many administer the platform. */
export function UsersFacts() {
  const all = useAdminUsers({ page: 0 }).data;
  const admins = useAdminUsers({ page: 0, role: "SUPERADMIN" }).data;
  if (!all) return null;
  return (
    <FactList
      facts={[
        { label: "Users", value: all.totalItems },
        ...(admins ? [{ label: "Superadmins", value: admins.totalItems }] : []),
      ]}
    />
  );
}
