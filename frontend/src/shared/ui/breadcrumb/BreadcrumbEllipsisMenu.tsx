/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Ellipsis } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { Link } from "react-router";
import { cx } from "@/shared/ui/cx";
import { FOCUS_RING } from "@/shared/ui/focus-ring";
import type { BreadcrumbTrailItem } from "./breadcrumb-context";

const MENU_ITEM =
  "flex cursor-pointer items-center rounded-control px-3 py-2 text-sm text-fg outline-none data-[highlighted]:bg-surface-muted";

/** The collapsed middle of a long trail, opened as a menu of its levels in order. */
export function BreadcrumbEllipsisMenu({ items }: { items: BreadcrumbTrailItem[] }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label={`Show ${items.length} more levels`}
        className={cx(
          "inline-flex size-6 cursor-pointer items-center justify-center rounded-control text-fg-muted transition hover:bg-surface-hover hover:text-fg",
          FOCUS_RING,
        )}
      >
        <Ellipsis size={16} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          collisionPadding={8}
          className="z-(--z-popover) min-w-48 max-w-80 rounded-menu border border-line bg-surface p-2 shadow-hover"
        >
          {items.map((item, index) =>
            item.to ? (
              <DropdownMenu.Item key={item.to} asChild className={MENU_ITEM}>
                <Link to={item.to}>
                  <span className="truncate">{item.label}</span>
                </Link>
              </DropdownMenu.Item>
            ) : (
              <DropdownMenu.Item
                key={`unlinked-${index}`}
                disabled
                className={cx(MENU_ITEM, "text-fg-secondary")}
              >
                <span className="truncate">{item.label}</span>
              </DropdownMenu.Item>
            ),
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
