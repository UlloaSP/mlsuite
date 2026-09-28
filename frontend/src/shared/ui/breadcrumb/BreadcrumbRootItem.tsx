/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { ChevronsUpDown } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { cx } from "@/shared/ui/cx";
import { FOCUS_RING } from "@/shared/ui/focus-ring";
import type { BreadcrumbRoot } from "./breadcrumb-context";
import { BreadcrumbLink } from "./BreadcrumbLink";
import { BreadcrumbPage } from "./BreadcrumbPage";

/** The first crumb: who the page belongs to, a link home, and an optional switcher. */
export function BreadcrumbRootItem({ current, root }: { current: boolean; root: BreadcrumbRoot }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-0.5">
      {current ? (
        <BreadcrumbPage>{root.label}</BreadcrumbPage>
      ) : (
        <BreadcrumbLink to={root.to}>{root.label}</BreadcrumbLink>
      )}
      {root.menu ? (
        <DropdownMenu.Root>
          <DropdownMenu.Trigger
            aria-label={root.menuLabel ?? `Open ${root.label} menu`}
            className={cx(
              "inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-control text-fg-muted transition hover:bg-surface-hover hover:text-fg",
              FOCUS_RING,
            )}
          >
            <ChevronsUpDown size={14} />
          </DropdownMenu.Trigger>
          {root.menu}
        </DropdownMenu.Root>
      ) : null}
    </span>
  );
}
