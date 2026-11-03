/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useHotkeys, useKeyHold, type UseHotkeyDefinition } from "@tanstack/react-hotkeys";
import { useNavigate } from "@tanstack/react-router";
import { RESTORE_SCROLL_STATE } from "@/app/layouts/use-scroll-memory";
import type { NavigationChild, NavigationItem } from "./sidebar-navigation-support";

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

/**
 * Alt+N opens the Nth entry and Alt+Shift+N the Nth child of the current section, read from
 * the physical digit or numpad key so Shift and keyboard layouts do not change it. Returns
 * whether Alt is held so entries can reveal their numbers.
 */
export function useNavigationShortcuts({
  navigation,
  shortcutChildren,
  showHints,
}: {
  navigation: NavigationItem[];
  shortcutChildren: () => NavigationChild[];
  showHints: boolean;
}) {
  const navigate = useNavigate();
  const altHeld = useKeyHold("Alt");

  // useHotkeys re-registers its definitions after every render, so this reads current entries.
  const open = (digit: number, child: boolean) => {
    const target = child ? shortcutChildren()[digit - 1] : navigation[digit - 1];
    if (!target) return;
    // A section resumes where it was, scroll included; a child page starts fresh.
    void navigate({ href: target.to, state: child ? undefined : RESTORE_SCROLL_STATE });
  };

  useHotkeys(
    DIGITS.flatMap((digit) =>
      [`Digit${digit}`, `Numpad${digit}`].flatMap((code) =>
        [false, true].map((shift): UseHotkeyDefinition => ({
          hotkey: { code, alt: true, shift },
          callback: () => open(digit, shift),
        })),
      ),
    ),
    { ignoreInputs: true, stopPropagation: false },
  );

  return showHints && altHeld;
}
