/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useAtomValue } from "jotai";
import { useEffect, useEffectEvent } from "react";
import {
  isTypingTarget,
  matchesShortcut,
  shortcutBindingsAtom,
  type ShortcutId,
} from "./shortcut-state";

/** Runs `handler` when the user's binding for `id` is pressed outside a text field. */
export function useShortcut(id: ShortcutId, handler: () => void) {
  const bindings = useAtomValue(shortcutBindingsAtom);
  const onShortcut = useEffectEvent(handler);
  const binding = bindings[id];

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target) || !matchesShortcut(event, binding)) return;
      event.preventDefault();
      onShortcut();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [binding]);
}
