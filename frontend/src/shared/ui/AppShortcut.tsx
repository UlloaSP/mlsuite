/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { AppKbd } from "./AppKbd";
import { AppKbdGroup } from "./AppKbdGroup";
import { shortcutLabels, type ShortcutBinding } from "./shortcut-state";

export function AppShortcut({
  binding,
  className,
}: {
  binding: ShortcutBinding;
  className?: string;
}) {
  return (
    <AppKbdGroup className={className}>
      {shortcutLabels(binding).map((label) => (
        <AppKbd key={label}>{label}</AppKbd>
      ))}
    </AppKbdGroup>
  );
}
