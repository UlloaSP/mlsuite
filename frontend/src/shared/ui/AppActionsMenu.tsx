/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Ellipsis, type LucideIcon } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { AppIconButton } from "./AppIconButton";
import { AppTooltip } from "./AppTooltip";
import { cx } from "./cx";

export type AppMenuAction = {
  key: string;
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  tone?: "danger";
  disabled?: boolean;
};

/**
 * The row overflow menu. It renders in a portal, so it is never clipped by the
 * scrolling list it sits in, and clicks inside never reach a clickable row.
 */
export function AppActionsMenu({
  actions,
  disabled,
  label,
}: {
  actions: AppMenuAction[];
  disabled?: boolean;
  /** Names the trigger, e.g. "Open actions for Churn model". */
  label: string;
}) {
  if (actions.length === 0) return null;

  return (
    <DropdownMenu.Root>
      <AppTooltip label={label} side="top">
        <DropdownMenu.Trigger asChild>
          <AppIconButton
            aria-label={label}
            disabled={disabled}
            onClick={(event) => event.stopPropagation()}
          >
            <Ellipsis size={18} />
          </AppIconButton>
        </DropdownMenu.Trigger>
      </AppTooltip>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          collisionPadding={8}
          onClick={(event) => event.stopPropagation()}
          className="z-(--z-popover) min-w-44 rounded-menu border border-line bg-surface p-2 shadow-hover"
        >
          {actions.map(({ key, label: actionLabel, icon: Icon, onSelect, tone, disabled }) => (
            <DropdownMenu.Item
              key={key}
              disabled={disabled}
              onSelect={onSelect}
              className={cx(
                "flex cursor-pointer items-center gap-3 rounded-control px-3 py-2.5 text-sm font-medium outline-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-45",
                tone === "danger"
                  ? "text-danger-fg data-[highlighted]:bg-danger-subtle"
                  : "text-fg data-[highlighted]:bg-surface-muted",
              )}
            >
              <Icon size={15} />
              {actionLabel}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
