/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useEffect, useEffectEvent, useState } from "react";
import { RESTORE_SCROLL_STATE } from "@/app/layouts/use-scroll-memory";
import { useNavigate } from "react-router";
import { isTypingTarget, type ShortcutEvent } from "@/shared/ui/shortcut-state";
import type { NavigationChild, NavigationItem } from "./sidebar-navigation-support";

const SHIFT_DIGITS: Record<string, number> = {
  "!": 1,
  "@": 2,
  "#": 3,
  $: 4,
  "%": 5,
  "^": 6,
  "&": 7,
  "*": 8,
  "(": 9,
};

/** The 1-9 digit a navigation shortcut names, reading the physical key when Shift changes it. */
export const shortcutDigit = (event: ShortcutEvent) => {
  const codeMatch = /^(Digit|Numpad)([1-9])$/.exec(event.code ?? "");
  if (codeMatch) {
    return Number(codeMatch[2]);
  }
  if (/^[1-9]$/.test(event.key)) {
    return Number(event.key);
  }
  return SHIFT_DIGITS[event.key] ?? null;
};

/**
 * Alt+N opens the Nth entry and Alt+Shift+N the Nth child of the current
 * section. Returns whether Alt is held so entries can reveal their numbers.
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
  const [altHeld, setAltHeld] = useState(false);

  const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.key === "Alt" && showHints && !isTypingTarget(event.target)) {
      setAltHeld(true);
    }

    if (!event.altKey || event.ctrlKey || event.metaKey || isTypingTarget(event.target)) {
      return;
    }

    const digit = shortcutDigit(event);
    if (!digit) return;

    const target = event.shiftKey ? shortcutChildren()[digit - 1] : navigation[digit - 1];
    if (!target) return;

    event.preventDefault();
    // A section resumes where it was, scroll included; a child page starts fresh.
    void navigate(target.to, {
      viewTransition: true,
      state: event.shiftKey ? undefined : RESTORE_SCROLL_STATE,
    });
  });

  useEffect(() => {
    const hide = () => setAltHeld(false);
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === "Alt") hide();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", hide);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", hide);
    };
  }, []);

  return altHeld;
}
