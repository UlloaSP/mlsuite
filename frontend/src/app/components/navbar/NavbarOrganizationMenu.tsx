/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Building2, ChevronsUpDown } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { useLocation } from "react-router";
import { useWorkspaceContext } from "@/capabilities/workspace-context/workspace-context";
import { cx } from "@/shared/ui/cx";
import { FOCUS_RING } from "@/shared/ui/focus-ring";
import { OrganizationMenuContent } from "@/app/components/OrganizationMenuContent";
import { sidebarMenuContent } from "@/app/components/sidebar-menu-styles";
import { isWorkspacePath } from "@/app/components/workspace-navigation";
import { NavbarLabel } from "./NavbarLabel";

export function NavbarOrganizationMenu({
  compact,
  menuSide,
}: {
  compact: boolean;
  menuSide: "top" | "bottom";
}) {
  const location = useLocation();
  const { data: context } = useWorkspaceContext();

  if (!context) {
    return null;
  }

  const organization = context.currentOrganization;
  const active = isWorkspacePath(location.pathname, organization.id);

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        data-user-guide-item="workspace-switcher"
        title={organization.name}
        className={cx(
          "inline-flex h-10 min-w-0 shrink-0 items-center rounded-xl px-1 text-left transition",
          !compact && "lg:pr-2",
          active ? "bg-accent-subtle" : "hover:bg-surface-hover",
          FOCUS_RING,
        )}
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-fg text-fg-inverse">
          <Building2 size={15} />
        </span>
        <NavbarLabel compact={compact} className="max-w-44">
          <span className="block truncate text-sm font-semibold text-fg">{organization.name}</span>
          <span className="block truncate text-xs text-fg-secondary">{organization.slug}</span>
        </NavbarLabel>
        <NavbarLabel compact={compact} className="flex">
          <ChevronsUpDown size={15} className="shrink-0 text-fg-muted" />
        </NavbarLabel>
      </DropdownMenu.Trigger>
      <OrganizationMenuContent
        align="start"
        side={menuSide}
        context={context}
        className={sidebarMenuContent(true)}
      />
    </DropdownMenu.Root>
  );
}
