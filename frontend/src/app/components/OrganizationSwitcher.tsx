/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useQueryClient } from "@tanstack/react-query";
import { Building } from "lucide-react";
import type { UserDTO } from "../../user/api/userService";
import { USER_QUERY_KEY } from "../../user/hooks";
import { setActiveOrganizationSlug } from "../api/tenant";
import { AppSelect, cx } from "./ui";

export function OrganizationSwitcher({ user }: { user: UserDTO }) {
  const queryClient = useQueryClient();

  if (user.organizations.length <= 1) {
    return null;
  }

  const handleChange = (slug: string) => {
    if (!slug || slug === user.activeOrganizationSlug) {
      return;
    }
    setActiveOrganizationSlug(slug);
    queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== USER_QUERY_KEY[0] });
    void queryClient.invalidateQueries();
  };

  return (
    <label className="flex flex-col gap-2">
      <span className="ml-2 inline-flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
        <Building size={12} />
        Workspace
      </span>
      <AppSelect
        value={user.activeOrganizationSlug}
        onChange={(event) => handleChange(event.target.value)}
        className={cx(
          "w-full border-[var(--border-soft)] bg-[var(--surface-secondary)] py-2.5 text-sm shadow-none",
          "hover:border-[var(--text-primary)]",
        )}
        aria-label="Select active organization"
      >
        {user.organizations.map((organization) => (
          <option key={organization.id} value={organization.slug}>
            {organization.name}
          </option>
        ))}
      </AppSelect>
    </label>
  );
}
