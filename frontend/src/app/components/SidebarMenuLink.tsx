/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { LucideIcon } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import type { ReactNode } from "react";
import { AppLink } from "@/shared/ui/AppLink";
import { appHref } from "@/shared/lib/app-href";
import { cx } from "@/shared/ui/cx";
import { SIDEBAR_MENU_ITEM } from "./sidebar-menu-styles";

export function SidebarMenuLink({
  active,
  icon: Icon,
  label,
  to,
  trailing,
}: {
  active: boolean;
  icon: LucideIcon;
  label: string;
  to: string;
  trailing?: ReactNode;
}) {
  return (
    <DropdownMenu.Item asChild>
      <AppLink
        {...appHref(to)}
        aria-current={active ? "page" : undefined}
        className={cx(
          SIDEBAR_MENU_ITEM,
          "h-9",
          active ? "bg-surface-selected text-accent-strong" : "text-fg",
        )}
      >
        <Icon size={15} className="shrink-0" />
        <span className="flex-1 truncate">{label}</span>
        {trailing}
      </AppLink>
    </DropdownMenu.Item>
  );
}
