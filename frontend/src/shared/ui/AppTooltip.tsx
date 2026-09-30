/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Tooltip } from "radix-ui";
import type { ReactElement } from "react";
import { AppKbd } from "./AppKbd";
import { ariaShortcutLabels } from "./shortcut-state";

/**
 * Names an icon-only control quickly, with its shortcut. The child must be one
 * element that accepts a ref and event props (a button, link, or Radix trigger).
 */
export function AppTooltip({
  children,
  disabled = false,
  label,
  shortcut,
  side = "right",
}: {
  children: ReactElement;
  disabled?: boolean;
  label: string;
  /** An `aria-keyshortcuts` value, shown as keys. */
  shortcut?: string;
  side?: "top" | "right" | "bottom" | "left";
}) {
  const keys = ariaShortcutLabels(shortcut);

  return (
    <Tooltip.Provider delayDuration={200} skipDelayDuration={300}>
      {/* Disabled closes the tooltip rather than unwrapping the child, so toggling
          it (e.g. collapsing the sidebar) never remounts and unfocuses the control. */}
      <Tooltip.Root open={disabled ? false : undefined}>
        <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side={side}
            sideOffset={8}
            collisionPadding={8}
            className="z-(--z-popover) flex items-center gap-2 rounded-control bg-surface-inverse px-2.5 py-1.5 text-xs font-medium text-fg-inverse shadow-overlay"
          >
            {label}
            {keys.length > 0 ? (
              <span className="flex gap-0.5 opacity-80">
                {keys.map((key) => (
                  <AppKbd key={key}>{key}</AppKbd>
                ))}
              </span>
            ) : null}
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
