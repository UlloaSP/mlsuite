/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useHotkeys, type UseHotkeyDefinition } from "@tanstack/react-hotkeys";
import { useSelector } from "@tanstack/react-store";
import { useEffectEvent } from "react";
import { shortcutBindingsAtom, type ShortcutBinding, type ShortcutId } from "./shortcut-state";

/** A binding's "mod" is Ctrl or Cmd on every platform, so it registers as both. */
const chords = ({ key, mod, alt, shift }: ShortcutBinding) =>
  mod
    ? [
        { key, ctrl: true, alt, shift },
        { key, meta: true, alt, shift },
      ]
    : [{ key, alt, shift }];

/** Runs `handler` when the user's binding for `id` is pressed outside a text field. */
export function useShortcut(id: ShortcutId, handler: () => void) {
  const binding = useSelector(shortcutBindingsAtom, (bindings) => bindings[id]);
  const onShortcut = useEffectEvent(handler);

  useHotkeys(
    chords(binding).map((hotkey): UseHotkeyDefinition => ({
      hotkey,
      callback: () => onShortcut(),
    })),
    { ignoreInputs: true, stopPropagation: false },
  );
}
